<#
.SYNOPSIS
    Report-only duplicate file finder. Never deletes, moves, or modifies any file.

.DESCRIPTION
    Pass 1: walk the roots, group files by exact size (cheap, metadata only).
    Pass 2: for same-size groups, hash the first 1 MB (SHA-256) to cut I/O on large files.
    Pass 3: full SHA-256 only for files whose size + head-hash still collide.
    Result: byte-identical matches, not name matches.

    Skips: 0-byte files, reparse points (junctions/symlinks, avoids loops and
    double counting), cloud-only placeholders (OneDrive/Dropbox "Files On-Demand",
    hashing would force a download), $RECYCLE.BIN, System Volume Information.

    Keeper suggestion per group (first rule that discriminates wins):
      1. Path under one of -PreferredRoots
      2. Path NOT looking like a copy/temp location (" - Copy", "(1)", \Downloads\, \Temp\, \Backup\ ...)
      3. Oldest CreationTime (a copy gets a fresh CreationTime; LastWriteTime is preserved by copy)
      4. Shortest path

.PARAMETER Roots
    Folders/drives to scan. Default: D:\ and E:\

.PARAMETER PreferredRoots
    Optional. Paths considered "primary" - copies here are preferred as keepers.

.PARAMETER MinSizeKB
    Ignore files smaller than this (default 1 KB). Raise it (e.g. 1024) for a faster first pass.

.PARAMETER OutDir
    Where to write the reports. Default: .\dedup_report_<timestamp>

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Find-DuplicateFiles.ps1 -Roots 'D:\','E:\' -PreferredRoots 'D:\Photos','D:\Work'
#>
[CmdletBinding()]
param(
    [string[]] $Roots          = @('D:\', 'E:\'),
    [string[]] $PreferredRoots = @(),
    [int]      $MinSizeKB      = 1,
    [string]   $OutDir         = (Join-Path (Get-Location) ("dedup_report_{0:yyyyMMdd_HHmmss}" -f (Get-Date)))
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$HeadBytes   = 1MB
$MinSize     = [int64]$MinSizeKB * 1KB
$SkipDirs    = @('$RECYCLE.BIN', 'System Volume Information', '_to_delete')
# FILE_ATTRIBUTE_OFFLINE | RECALL_ON_OPEN | RECALL_ON_DATA_ACCESS
$CloudMask   = 0x1000 -bor 0x40000 -bor 0x400000
$CopyPattern = '(?i)( - copy( \(\d+\))?\.|\(\d+\)\.[^\\]+$|\\downloads\\|\\temp\\|\\tmp\\|\\backup[^\\]*\\|\\old\\|\\copy of )'

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$errors = New-Object System.Collections.Generic.List[object]
function Add-Err([string]$Path, [string]$Stage, [string]$Msg) {
    $errors.Add([pscustomobject]@{ Stage = $Stage; Path = $Path; Error = $Msg })
}

# ---------- Pass 1: enumerate + group by size ----------
$bySize  = @{}
$scanned = 0
$sw      = [Diagnostics.Stopwatch]::StartNew()

foreach ($root in $Roots) {
    if (-not (Test-Path -LiteralPath $root)) { Add-Err $root 'enumerate' 'Root not found'; continue }
    $stack = New-Object System.Collections.Generic.Stack[System.IO.DirectoryInfo]
    $stack.Push((Get-Item -LiteralPath $root -Force))

    while ($stack.Count -gt 0) {
        $dir = $stack.Pop()
        try   { $entries = $dir.GetFileSystemInfos() }
        catch { Add-Err $dir.FullName 'enumerate' $_.Exception.Message; continue }

        foreach ($e in $entries) {
            if ($e.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
            if ($e -is [System.IO.DirectoryInfo]) {
                if ($SkipDirs -notcontains $e.Name) { $stack.Push($e) }
                continue
            }
            if (([int]$e.Attributes -band $CloudMask) -ne 0) { continue }
            if ($e.Length -lt $MinSize -or $e.Length -eq 0)   { continue }

            $scanned++
            if (-not $bySize.ContainsKey($e.Length)) {
                $bySize[$e.Length] = New-Object System.Collections.Generic.List[System.IO.FileInfo]
            }
            $bySize[$e.Length].Add($e)
            if ($scanned % 5000 -eq 0) {
                Write-Progress -Activity 'Pass 1/3: enumerating' -Status "$scanned files - $($dir.FullName)"
            }
        }
    }
}
Write-Progress -Activity 'Pass 1/3: enumerating' -Completed

$sizeGroups = @($bySize.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 })
$candidates = ($sizeGroups | ForEach-Object { $_.Value.Count } | Measure-Object -Sum).Sum
Write-Host ("Pass 1: {0:N0} files scanned, {1:N0} share a size with another file ({2:N0} size groups)" -f $scanned, [int64]$candidates, $sizeGroups.Count)

# ---------- hashing helpers ----------
$sha = [System.Security.Cryptography.SHA256]::Create()
function Get-Sha256([System.IO.FileInfo]$File, [int64]$Limit) {
    $fs = [System.IO.File]::Open($File.FullName, 'Open', 'Read', 'ReadWrite')
    try {
        if ($Limit -gt 0 -and $File.Length -gt $Limit) {
            $buf  = New-Object byte[] $Limit
            $read = 0
            while ($read -lt $Limit) {
                $n = $fs.Read($buf, $read, [int]($Limit - $read))
                if ($n -le 0) { break }
                $read += $n
            }
            $bytes = $sha.ComputeHash($buf, 0, $read)
        } else {
            $bytes = $sha.ComputeHash($fs)
        }
        return [BitConverter]::ToString($bytes).Replace('-', '')
    } finally { $fs.Dispose() }
}

# ---------- Pass 2 + 3: head hash, then full hash ----------
$dupGroups = New-Object System.Collections.Generic.List[object]
$i = 0
foreach ($sg in $sizeGroups) {
    $i++
    Write-Progress -Activity 'Pass 2-3/3: hashing' -Status ("size group {0:N0}/{1:N0} ({2:N0} bytes)" -f $i, $sizeGroups.Count, $sg.Key) -PercentComplete (100 * $i / $sizeGroups.Count)

    $size  = [int64]$sg.Key
    $files = $sg.Value

    # Pass 2 (only worth it when the file is larger than the head window)
    $buckets = @{}
    if ($size -gt $HeadBytes) {
        foreach ($f in $files) {
            try   { $h = Get-Sha256 $f $HeadBytes }
            catch { Add-Err $f.FullName 'head-hash' $_.Exception.Message; continue }
            if (-not $buckets.ContainsKey($h)) { $buckets[$h] = New-Object System.Collections.Generic.List[System.IO.FileInfo] }
            $buckets[$h].Add($f)
        }
    } else {
        $buckets['all'] = $files
    }

    # Pass 3
    foreach ($b in $buckets.Values) {
        if ($b.Count -lt 2) { continue }
        $full = @{}
        foreach ($f in $b) {
            try   { $h = Get-Sha256 $f 0 }
            catch { Add-Err $f.FullName 'full-hash' $_.Exception.Message; continue }
            if (-not $full.ContainsKey($h)) { $full[$h] = New-Object System.Collections.Generic.List[System.IO.FileInfo] }
            $full[$h].Add($f)
        }
        foreach ($kv in $full.GetEnumerator()) {
            if ($kv.Value.Count -gt 1) {
                $dupGroups.Add([pscustomobject]@{ Hash = $kv.Key; Size = $size; Files = $kv.Value })
            }
        }
    }
}
Write-Progress -Activity 'Pass 2-3/3: hashing' -Completed
$sha.Dispose()

# ---------- keeper selection + report ----------
function Test-Preferred([string]$Path) {
    foreach ($p in $PreferredRoots) {
        $root = $p.TrimEnd('\') + '\'
        if ($Path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
    return $false
}

$rows        = New-Object System.Collections.Generic.List[object]
$gid         = 0
$totalReclaim = [int64]0

foreach ($g in ($dupGroups | Sort-Object { $_.Size * ($_.Files.Count - 1) } -Descending)) {
    $gid++
    $ranked = $g.Files | Sort-Object `
        @{ Expression = { if (Test-Preferred $_.FullName) { 0 } else { 1 } } }, `
        @{ Expression = { if ($_.FullName -match $CopyPattern) { 1 } else { 0 } } }, `
        @{ Expression = { $_.CreationTimeUtc } }, `
        @{ Expression = { $_.FullName.Length } }

    $keeper  = $ranked[0]
    $reason  = if (Test-Preferred $keeper.FullName) { 'in PreferredRoots' }
               elseif ($keeper.FullName -notmatch $CopyPattern -and ($ranked | Where-Object { $_.FullName -match $CopyPattern })) { 'others look like copies' }
               else { 'oldest CreationTime' }
    $reclaim = $g.Size * ($g.Files.Count - 1)
    $totalReclaim += $reclaim

    foreach ($f in $ranked) {
        $isKeep = ($f.FullName -eq $keeper.FullName)
        $rows.Add([pscustomobject]@{
            GroupId           = $gid
            Suggestion        = if ($isKeep) { 'KEEP' } else { 'DELETE_CANDIDATE' }
            KeepReason        = if ($isKeep) { $reason } else { '' }
            FullName          = $f.FullName
            SizeBytes         = $g.Size
            SizeMB            = [math]::Round($g.Size / 1MB, 2)
            Copies            = $g.Files.Count
            GroupReclaimMB    = [math]::Round($reclaim / 1MB, 2)
            CreationTime      = $f.CreationTime.ToString('yyyy-MM-dd HH:mm:ss')
            LastWriteTime     = $f.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
            Drive             = $f.FullName.Substring(0, 2)
            SHA256            = $g.Hash
        })
    }
}

$csv     = Join-Path $OutDir 'duplicates.csv'
$errCsv  = Join-Path $OutDir 'errors.csv'
$summary = Join-Path $OutDir 'summary.txt'

$rows   | Export-Csv -LiteralPath $csv    -NoTypeInformation -Encoding UTF8
$errors | Export-Csv -LiteralPath $errCsv -NoTypeInformation -Encoding UTF8

$crossDrive = @($rows | Group-Object GroupId | Where-Object { @($_.Group.Drive | Select-Object -Unique).Count -gt 1 }).Count
@"
Duplicate scan (REPORT ONLY - nothing was deleted or moved)
Run at         : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') on $env:COMPUTERNAME
Roots          : $($Roots -join ', ')
PreferredRoots : $(if ($PreferredRoots) { $PreferredRoots -join ', ' } else { '(none)' })
MinSize        : $MinSizeKB KB
Elapsed        : $([math]::Round($sw.Elapsed.TotalMinutes, 1)) min

Files scanned          : $('{0:N0}' -f $scanned)
Duplicate groups       : $('{0:N0}' -f $gid)
Cross-drive groups     : $('{0:N0}' -f $crossDrive)
Delete candidates      : $('{0:N0}' -f @($rows | Where-Object Suggestion -eq 'DELETE_CANDIDATE').Count)
Reclaimable            : $('{0:N2}' -f ($totalReclaim / 1GB)) GB
Errors (see errors.csv): $($errors.Count)

Top 20 groups by reclaimable space:
$(($rows | Where-Object Suggestion -eq 'KEEP' | Select-Object -First 20 | ForEach-Object { '  #{0,-5} {1,9:N1} MB x{2}  {3}' -f $_.GroupId, $_.GroupReclaimMB, $_.Copies, $_.FullName }) -join "`r`n")
"@ | Set-Content -LiteralPath $summary -Encoding UTF8

Write-Host ''
Get-Content -LiteralPath $summary | Write-Host
Write-Host ''
Write-Host "Reports written to: $OutDir" -ForegroundColor Green
