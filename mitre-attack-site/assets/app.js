// =========================================================================
// MITRE ATT&CK Mind Map Studio — application logic
// Depends on globals from mitre-db.js (MITRE_FULL_DB) and curated.js
// (APT_PROFILES, PLAYBOOK_DATA, MINDMAP_DATA, SUBTECHNIQUE_KB).
// =========================================================================

// Escape user-supplied text before it is placed into innerHTML templates.
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

// =========================================================================
// 1. APPLICATION STATE
// =========================================================================
let currentMainView = 'mindmap';
let currentDomainFilter = 'all';
let currentSubdomainFilter = 'all';
let currentAptOverlay = 'none';
let currentRoleLens = 'all';
let currentSearchQuery = '';
let currentMatrixPlatform = 'enterprise';
let currentExportFormat = 'mermaid';
let selectedNodeId = 'ROOT';

// Mind map visual mode: 'network' (constellation orbs), 'radial' (spider pills), or 'tree'
let mindmapLayoutMode = 'network';
let isPaperLightTheme = false;
let customCenterRootId = 'DOM-ENT';
const customNodeOffsets = new Map();

// User-added notes and content overrides, persisted per browser. Values are stored already HTML-escaped.
let customUserEdits = storageGet('mitre_custom_edits_v1', {});

const BRANCH_PALETTES = [
  { name: 'red',     stroke: '#e11d48', border: '#e11d48', lightBg: '#ffe4e6', lightText: '#881337', darkBg: '#4c0519', darkText: '#fecdd3', badgeBg: '#f43f5e' },
  { name: 'purple',  stroke: '#7c3aed', border: '#7c3aed', lightBg: '#ede9fe', lightText: '#4c1d95', darkBg: '#2e1065', darkText: '#ddd6fe', badgeBg: '#8b5cf6' },
  { name: 'amber',   stroke: '#d97706', border: '#d97706', lightBg: '#fef3c7', lightText: '#78350f', darkBg: '#451a03', darkText: '#fde68a', badgeBg: '#f59e0b' },
  { name: 'cyan',    stroke: '#0284c7', border: '#0284c7', lightBg: '#e0f2fe', lightText: '#0c4a6e', darkBg: '#082f49', darkText: '#bae6fd', badgeBg: '#0ea5e9' },
  { name: 'emerald', stroke: '#16a34a', border: '#16a34a', lightBg: '#dcfce7', lightText: '#14532d', darkBg: '#052e16', darkText: '#bbf7d0', badgeBg: '#10b981' },
  { name: 'orange',  stroke: '#ea580c', border: '#ea580c', lightBg: '#ffedd5', lightText: '#7c2d12', darkBg: '#431407', darkText: '#fed7aa', badgeBg: '#f97316' },
  { name: 'pink',    stroke: '#db2777', border: '#db2777', lightBg: '#fce7f3', lightText: '#831843', darkBg: '#500724', darkText: '#fbcfe8', badgeBg: '#ec4899' },
  { name: 'teal',    stroke: '#0d9488', border: '#0d9488', lightBg: '#ccfbf1', lightText: '#134e4a', darkBg: '#042f2e', darkText: '#99f6e4', badgeBg: '#14b8a6' },
  { name: 'indigo',  stroke: '#4f46e5', border: '#4f46e5', lightBg: '#e0e7ff', lightText: '#312e81', darkBg: '#1e1b4b', darkText: '#c7d2fe', badgeBg: '#6366f1' },
  { name: 'lime',    stroke: '#65a30d', border: '#65a30d', lightBg: '#ecfccb', lightText: '#365314', darkBg: '#1a2e05', darkText: '#d9f99d', badgeBg: '#84cc16' }
];

// =========================================================================
// 2. BUILD THE TREE: merge full DB, expand sub-techniques, restore user edits
// =========================================================================

// Turn each `subtechniques` string into an interactive child node with three 5th-level detail nodes.
function enrichSubtechniquesAsNodes(node) {
  if (node.subtechniques && node.subtechniques.length && (!node.children || node.children.length === 0)) {
    node.children = node.subtechniques.map((st, idx) => {
      const m = st.match(/^(T\d{4})\.(\d{3})\s*(.*)$/);
      const code = m ? `${m[1]}.${m[2]}` : `${node.code}.${idx + 1}`;
      const rawTitle = m && m[3] ? m[3] : st;
      const subUrl = m ? `https://attack.mitre.org/techniques/${m[1]}/${m[2]}/` : (node.url || 'https://attack.mitre.org/');
      const kb = SUBTECHNIQUE_KB[code] || {};
      const prefix = node.id !== node.code ? `${node.id}-` : '';
      const subId = m ? `${prefix}${m[1]}.${m[2]}` : `${node.id}-SUB-${idx + 1}`;

      const subWhy = kb.why || `เป้าหมายย่อยของ ${node.code} (${node.title}): ${node.why}`;
      const subHow = kb.how || `ดำเนินการผ่านเทคนิคย่อย ${rawTitle} (${code}) โดยอาศัยกลไกของ ${node.title} เพื่อเจาะจงช่องทางปฏิบัติการ`;
      const subRed = kb.redTeam || `จำลองการโจมตีเฉพาะจุดด้วยรูปแบบ ${rawTitle} (${code}): ${node.redTeam}`;
      const subBlue = kb.blueTeam || `ตรวจจับและตั้งกฎแจ้งเตือนเฉพาะสำหรับ ${rawTitle} (${code}): ${node.blueTeam}`;
      const subSubtitle = kb.subtitle || `เทคนิคย่อย (${rawTitle}) ภายใต้หมวด ${node.code} ${node.title}`;
      const subDS = kb.dataSources || node.dataSources || [];
      const subMit = kb.mitigations || node.mitigations || [];

      const detailChildren = [
        {
          id: `${subId}-PROC`, code: `⚔ ${code}`, title: `วิธีโจมตี: ${rawTitle}`, subtitle: subHow,
          domain: node.domain, nodeType: 'detail', url: subUrl,
          why: subWhy, how: subHow, redTeam: subRed, blueTeam: subBlue, dataSources: subDS, mitigations: subMit
        },
        {
          id: `${subId}-DET`, code: `🛡 Detect`, title: `การตรวจจับ ${code}`, subtitle: subBlue,
          domain: node.domain, nodeType: 'detail', url: subUrl,
          why: `เพื่อตรวจจับพฤติกรรมของ ${code} ${rawTitle} ได้อย่างแม่นยำ`, how: subBlue,
          redTeam: subRed, blueTeam: subBlue, dataSources: subDS, mitigations: subMit
        },
        {
          id: `${subId}-MIT`, code: `🔒 Mitigate`, title: `การป้องกัน (${(subMit[0] || 'Hardening').split(' ')[0]})`,
          subtitle: subMit.join(' • '), domain: node.domain, nodeType: 'detail', url: subUrl,
          why: `ลดความเสี่ยงและปิดช่องทางของ ${code} ${rawTitle}`, how: `มาตรการป้องกันหลัก: ${subMit.join(', ')}`,
          redTeam: subRed, blueTeam: subBlue, dataSources: subDS, mitigations: subMit
        }
      ];

      return {
        id: subId, code: code, title: rawTitle, subtitle: subSubtitle,
        domain: node.domain, platforms: node.platforms || [], nodeType: 'subtechnique', url: subUrl,
        why: subWhy, how: subHow, redTeam: subRed, blueTeam: subBlue,
        dataSources: subDS, mitigations: subMit, children: detailChildren
      };
    });
  }
  if (node.children && node.children.length) {
    node.children.forEach(c => enrichSubtechniquesAsNodes(c));
  }
}

// Merge the full ATT&CK dataset into MINDMAP_DATA, keeping curated Thai text for techniques that have it.
function integrateFullMitreDatabase() {
  const existingTechMap = new Map();
  function collectExisting(n) {
    if (n.code && /^T\d{4}$/.test(n.code) && !existingTechMap.has(n.code)) {
      existingTechMap.set(n.code, n);
    }
    if (n.children) n.children.forEach(collectExisting);
  }
  collectExisting(MINDMAP_DATA);

  function buildTechniqueNode(techObj, domainKey, tacticCode, seenPrimarySet) {
    const tid = techObj.id;
    const richExisting = existingTechMap.get(tid);
    const isFirstInstance = !seenPrimarySet.has(tid);
    seenPrimarySet.add(tid);
    // A technique listed under several tactics keeps its bare ID only the first time.
    const nodeId = isFirstInstance ? tid : `${tacticCode}-${tid}`;

    const subStrings = (techObj.subs || []).map(s => `${s.id} ${s.name}`);
    (techObj.subs || []).forEach(s => {
      if (!SUBTECHNIQUE_KB[s.id]) {
        SUBTECHNIQUE_KB[s.id] = {
          subtitle: s.desc,
          why: `เป้าหมายย่อยของ ${tid} (${techObj.name}) ในหมวด ${tacticCode}: ${s.desc}`,
          how: `ดำเนินการผ่านเทคนิคย่อย ${s.id} (${s.name}) บนแพลตฟอร์ม ${(techObj.platforms || []).join(', ') || domainKey.toUpperCase()}`,
          redTeam: `จำลองพฤติกรรม ${s.id} ${s.name} ตามขั้นตอนใน MITRE ATT&CK v20.0 (${s.desc})`,
          blueTeam: `เฝ้าระวัง Telemetry และสร้างกฎตรวจจับสำหรับ ${s.id} (${s.name}) บน ${(techObj.platforms || []).join(', ') || domainKey.toUpperCase()}`,
          dataSources: (richExisting && richExisting.dataSources) || ["Process Creation", "Command Execution", "Network Traffic", "Authentication & Audit Logs"],
          mitigations: (richExisting && richExisting.mitigations) || ["M1047 Audit", "M1026 Privileged Account Management", "M1040 Behavior Prevention on Endpoint"]
        };
      }
    });

    const platformsList = techObj.platforms || [];
    const platBadge = platformsList.length ? `[${platformsList.join(', ')}] ` : '';

    return {
      id: nodeId,
      code: tid,
      title: techObj.name,
      subtitle: richExisting ? richExisting.subtitle : `${platBadge}${techObj.desc}`,
      domain: domainKey,
      platforms: platformsList,
      nodeType: 'technique',
      url: `https://attack.mitre.org/techniques/${tid}/`,
      why: (richExisting && richExisting.why) || `เป้าหมายภายใต้ยุทธวิธี ${tacticCode}: ${techObj.desc}`,
      how: (richExisting && richExisting.how) || (subStrings.length ? `ครอบคลุม ${subStrings.length} Sub-techniques: ${subStrings.join(', ')}` : techObj.desc),
      redTeam: (richExisting && richExisting.redTeam) || `ทดสอบจำลองเทคนิค ${tid} (${techObj.name}) บนแพลตฟอร์ม ${platformsList.join(', ') || domainKey.toUpperCase()}`,
      blueTeam: (richExisting && richExisting.blueTeam) || `สร้างกฎตรวจจับ (SIEM/EDR Detection Analytics) และวางมาตรการป้องกันสำหรับ ${tid} ${techObj.name}`,
      dataSources: (richExisting && richExisting.dataSources) || ["Process & OS Telemetry", "Command & Script Logs", "Network Traffic Flow", "Cloud & Identity Logs"],
      mitigations: (richExisting && richExisting.mitigations) || ["M1047 Audit", "M1026 Privileged Account Management", "M1038 Execution Prevention"],
      subtechniques: subStrings.length ? subStrings : ((richExisting && richExisting.subtechniques) || [])
    };
  }

  const seenPrimary = new Set();

  // 1. Enterprise
  const entBranch = MINDMAP_DATA.children.find(c => c.id === 'DOM-ENT');
  if (entBranch) {
    const oldTacticsById = new Map((entBranch.children || []).map(t => [t.id, t]));
    const ent = MITRE_FULL_DB.enterprise;
    const entSubCount = Object.values(ent.techniques).reduce((a, t) => a + (t.subs || []).length, 0);
    entBranch.title = `1. Enterprise Matrix (${ent.tactics.length} Tactics • ${Object.keys(ent.techniques).length} Techs • ${entSubCount} Sub-techs)`;
    entBranch.subtitle = "ครบทุกแพลตฟอร์ม: PRE • Windows • macOS • Linux • Cloud (Office Suite/IdP/SaaS/IaaS) • Network Devices • Containers • ESXi";
    entBranch.children = ent.tactics.map(tDef => {
      const oldTa = oldTacticsById.get(tDef.id) || {};
      const techChildren = tDef.techIds.map(tid => {
        const tObj = ent.techniques[tid];
        return tObj ? buildTechniqueNode(tObj, 'enterprise', tDef.id, seenPrimary) : null;
      }).filter(Boolean);
      const taPlats = Array.from(new Set(techChildren.flatMap(tc => tc.platforms || [])));
      return {
        id: tDef.id, code: tDef.id, title: tDef.title, subtitle: tDef.subtitle,
        domain: 'enterprise', platforms: taPlats, nodeType: 'tactic',
        url: `https://attack.mitre.org/tactics/${tDef.id}/`,
        why: oldTa.why || tDef.subtitle,
        how: oldTa.how || `ประกอบด้วย ${techChildren.length} Techniques หลัก และ Sub-techniques ย่อยครบทุกข้อจาก MITRE ATT&CK v20.0`,
        redTeam: oldTa.redTeam || `วางแผนจำลองการโจมตีในระยะ ${tDef.title}`,
        blueTeam: oldTa.blueTeam || `ตรวจสอบ Detection Coverage และ Log Data Sources สำหรับ ${tDef.title}`,
        dataSources: oldTa.dataSources || ["Process Creation", "Command Execution", "Network Traffic", "Cloud & Identity Logs"],
        mitigations: oldTa.mitigations || ["M1047 Audit", "M1032 Multi-factor Authentication", "M1026 Privileged Account Management"],
        children: techChildren
      };
    });
  }

  // 2. Mobile
  const mobBranch = MINDMAP_DATA.children.find(c => c.id === 'DOM-MOB');
  if (mobBranch) {
    const mob = MITRE_FULL_DB.mobile;
    const mobSubCount = Object.values(mob.techniques).reduce((a, t) => a + (t.subs || []).length, 0);
    mobBranch.title = `2. Mobile Matrix (${mob.tactics.length} Tactics • ${Object.keys(mob.techniques).length} Techs • ${mobSubCount} Sub-techs)`;
    mobBranch.subtitle = "Android & iOS • Device Access & Network-Based Effects";
    mobBranch.children = mob.tactics.map(tDef => {
      const techChildren = tDef.techIds.map(tid => {
        const tObj = mob.techniques[tid];
        return tObj ? buildTechniqueNode(tObj, 'mobile', tDef.id, seenPrimary) : null;
      }).filter(Boolean);
      const taPlats = Array.from(new Set(techChildren.flatMap(tc => tc.platforms || [])));
      return {
        id: tDef.id, code: tDef.id, title: tDef.title, subtitle: tDef.subtitle,
        domain: 'mobile', platforms: taPlats, nodeType: 'tactic',
        url: `https://attack.mitre.org/tactics/${tDef.id}/`,
        why: tDef.subtitle,
        how: `ครอบคลุม ${techChildren.length} Mobile Techniques บนระบบ Android และ iOS`,
        redTeam: `ทดสอบความปลอดภัยแอปมือถือ (MASVS) และจำลองเทคนิคในหมวด ${tDef.title}`,
        blueTeam: `บังคับใช้นโยบาย MDM/UEM และตรวจจับด้วย Mobile Threat Defense (MTD)`,
        dataSources: ["MDM / UEM Telemetry", "Mobile Threat Defense (MTD)", "Application Vetting"],
        mitigations: ["M1012 Enterprise Policy (MDM)", "M1002 Attestation", "M1001 Security Updates"],
        children: techChildren
      };
    });
  }

  // 3. ICS / OT (+ 18 ICS assets)
  const icsBranch = MINDMAP_DATA.children.find(c => c.id === 'DOM-ICS');
  if (icsBranch) {
    const ics = MITRE_FULL_DB.ics;
    const icsSubCount = Object.values(ics.techniques).reduce((a, t) => a + (t.subs || []).length, 0);
    icsBranch.title = `3. ICS / OT Matrix (${ics.tactics.length} Tactics • ${Object.keys(ics.techniques).length} Techs • ${icsSubCount} Sub-techs • ${ics.assets.length} Assets)`;
    icsBranch.subtitle = "Embedded • Windows • Linux • Network Devices • PLC / RTU / HMI / SCADA / SIS";
    const icsTacticNodes = ics.tactics.map(tDef => {
      const techChildren = tDef.techIds.map(tid => {
        const tObj = ics.techniques[tid];
        return tObj ? buildTechniqueNode(tObj, 'ics', tDef.id, seenPrimary) : null;
      }).filter(Boolean);
      return {
        id: tDef.id, code: tDef.id, title: tDef.title, subtitle: tDef.subtitle,
        domain: 'ics', platforms: ["ICS Embedded", "ICS Windows", "ICS Linux", "ICS Network Devices"], nodeType: 'tactic',
        url: `https://attack.mitre.org/tactics/${tDef.id}/`,
        why: tDef.subtitle,
        how: `ครอบคลุม ${techChildren.length} ICS/OT Techniques สำหรับระบบควบคุมอุตสาหกรรม`,
        redTeam: `ประเมินความปลอดภัยเครือข่าย IT/OT และโปรโตคอลอุตสาหกรรมในหมวด ${tDef.title}`,
        blueTeam: `แบ่งโซนเครือข่ายตาม IEC 62443 / Purdue Model และใช้ Passive OT NDR ตรวจจับ`,
        dataSources: ["OT Passive Network Tap (Modbus/DNP3/S7/OPC)", "Engineering Workstation Logs", "Historian & Alarm Logs"],
        mitigations: ["M0930 Network Segmentation", "M0812 Safety Instrumented Systems", "M0800 Authorization Enforcement"],
        children: techChildren
      };
    });

    icsTacticNodes.push({
      id: "ICS-ASSETS",
      code: `ASSETS (${ics.assets.length})`,
      title: "13. ICS Assets (A0001–A0018 อุปกรณ์เป้าหมายในโรงงาน)",
      subtitle: "PLC • HMI • RTU • IED • Safety Controller • Data Historian • Control Server • Jump Host",
      domain: "ics",
      platforms: ["ICS Embedded", "ICS Windows", "ICS Linux", "ICS Network Devices"],
      nodeType: "tactic",
      url: "https://attack.mitre.org/assets/",
      why: "ระบุอุปกรณ์เป้าหมายทางกายภาพและระบบควบคุมในโรงงานอุตสาหกรรมที่ผู้โจมตีมุ่งเป้า",
      how: "เชื่อมโยงอุปกรณ์ทั้ง 18 ชนิด (A0001 ถึง A0018) เข้ากับ Techniques ที่อาจเกิดกับอุปกรณ์แต่ละประเภท",
      redTeam: "ทำ Asset Discovery และจำลองเส้นทางการเข้าถึงอุปกรณ์สำคัญใน Purdue Model",
      blueTeam: "จัดทำ OT Asset Inventory และวางมาตรการป้องกันเฉพาะตามบทบาทของอุปกรณ์แต่ละชิ้น",
      dataSources: ["OT Asset Inventory", "Passive Network Monitoring", "Controller Configuration Audit"],
      mitigations: ["M0930 Network Segmentation", "M0801 Access Management", "M0812 Safety Instrumented Systems"],
      children: ics.assets.map(a => ({
        id: a.id, code: a.id, title: a.name, subtitle: a.desc,
        domain: "ics", platforms: ["ICS Embedded", "ICS Windows", "ICS Linux", "ICS Network Devices"],
        nodeType: "technique", url: `https://attack.mitre.org/assets/${a.id}/`,
        why: a.desc,
        how: `อุปกรณ์เป้าหมายรหัส ${a.id} (${a.name}) ในสภาพแวดล้อม ICS/OT`,
        redTeam: `วิเคราะห์ช่องทางการเข้าถึงและโปรโตคอลที่เชื่อมต่อกับ ${a.name} (${a.id})`,
        blueTeam: `จำกัดสิทธิ์การเข้าถึง เฝ้าระวังการแก้ไขตั้งค่า และแยกเครือข่ายของ ${a.name} (${a.id})`,
        dataSources: ["OT Network Traffic", "Asset Configuration Logs"],
        mitigations: ["M0800 Authorization Enforcement", "M0930 Network Segmentation"],
        subtechniques: [`${a.id}.1 Architecture & Role Verification`, `${a.id}.2 Protocol & Access Hardening`]
      }))
    });
    icsBranch.children = icsTacticNodes;
  }

  // 4. Branch 6: sub-domains / platform matrices
  MINDMAP_DATA.children.push({
    id: "DOM-SUB",
    code: "SUB-DOMAINS",
    title: `6. Sub-Domains & Platform Matrices (${MITRE_FULL_DB.subdomains.length} แพลตฟอร์มย่อย)`,
    subtitle: "PRE • Windows • macOS • Linux • Cloud (Office/IdP/SaaS/IaaS) • Network • Containers • ESXi • Android • iOS • ICS",
    domain: "all",
    nodeType: "domain",
    url: "https://attack.mitre.org/matrices/",
    why: "ช่วยให้เจาะจงเฉพาะเทคนิคที่เกี่ยวข้องกับระบบปฏิบัติการหรือคลาวด์ที่องค์กรใช้งานจริง (Platform-Specific Sub-Domains)",
    how: "แบ่งออกเป็นแพลตฟอร์มย่อยตามโครงสร้างทางการของเว็บไซต์ attack.mitre.org/matrices/ พร้อมตัวกรองด้านบน",
    redTeam: "เลือกชุดเทคนิคให้ตรงกับ Target Tech Stack เช่น โจมตีเฉพาะ Containers/Kubernetes, ESXi หรือ Entra ID",
    blueTeam: "ใช้จัดลำดับความสำคัญของการตั้งค่า Log และ Detection Rules ให้ตรงกับแพลตฟอร์มที่มีในองค์กร",
    dataSources: ["OS Audit Logs", "Cloud Provider Native Logs", "Hypervisor & Container Runtime Logs"],
    mitigations: ["Platform-Specific Hardening Baselines", "Zero Trust Architecture"],
    children: MITRE_FULL_DB.subdomains.map(sd => ({
      id: `SUBDOM-${sd.id.replace(/\s+/g, '-')}`,
      code: sd.id.toUpperCase(),
      title: sd.title,
      subtitle: sd.desc,
      domain: sd.domain,
      platforms: [sd.id],
      nodeType: "tactic",
      url: sd.url,
      why: sd.desc,
      how: `คลิกปุ่ม "${sd.id}" บนแถบ Sub-Domains ด้านบนเพื่อกรอง Mind Map และตาราง Kill-Chain เฉพาะแพลตฟอร์ม ${sd.title}`,
      redTeam: `ใช้เป็นคู่มือเจาะระบบเฉพาะแพลตฟอร์ม ${sd.title} (${sd.url})`,
      blueTeam: `วางมาตรการป้องกันและเก็บ Log เฉพาะสำหรับแพลตฟอร์ม ${sd.title}`,
      dataSources: [`${sd.title} Native Telemetry & Audit Logs`],
      mitigations: [`${sd.title} Security Configuration Baseline`],
      subtechniques: [`Filter Mind Map by ${sd.id}`, `View Official Matrix: ${sd.id}`]
    }))
  });
}

// Flat lookup map for all nodes
const NODE_MAP = new Map();
function indexNodes(node, depth = 0, parentId = null, branchIdx = 0) {
  node._depth = depth;
  node._parentId = parentId;
  node._branchIdx = branchIdx;
  NODE_MAP.set(node.id, node);
  if (node.children && node.children.length) {
    node.children.forEach((child, i) => {
      const nextBranchIdx = depth <= 1 ? i : branchIdx;
      indexNodes(child, depth + 1, node.id, nextBranchIdx);
    });
  }
}

function makeCustomChild(parent, id, title, body) {
  return {
    id: id,
    code: `📝 ${parent.code}`,
    title: title,
    subtitle: body,
    domain: parent.domain,
    nodeType: 'detail',
    url: parent.url || 'https://attack.mitre.org/',
    why: title,
    how: body,
    redTeam: parent.redTeam,
    blueTeam: body,
    dataSources: parent.dataSources || [],
    mitigations: parent.mitigations || []
  };
}

// Re-apply saved notes and overrides to any node (tactic, technique, sub-technique, ...).
function restoreCustomEdits() {
  Object.entries(customUserEdits).forEach(([nodeId, edit]) => {
    const node = NODE_MAP.get(nodeId);
    if (!node || !edit) return;
    if (edit.subtitle) node.subtitle = edit.subtitle;
    if (edit.how) node.how = edit.how;
    if (edit.customNotes && edit.customNotes.length) {
      if (!node.children) node.children = [];
      edit.customNotes.forEach((cn, i) => {
        node.children.push(makeCustomChild(node, `${node.id}-USER-${i + 1}`, cn.title, cn.body));
      });
    }
  });
}

integrateFullMitreDatabase();
enrichSubtechniquesAsNodes(MINDMAP_DATA);
indexNodes(MINDMAP_DATA);
restoreCustomEdits();
NODE_MAP.clear();
indexNodes(MINDMAP_DATA);

// Start with the main branches and a few sample clusters expanded so the layout is visible immediately.
const expandedNodes = new Set(['ROOT', 'DOM-ENT', 'DOM-MOB', 'DOM-ICS', 'DOM-CTI', 'DOM-DEF', 'TA0043', 'T1598', 'T1598.001', 'TA0001', 'TA0002', 'TA0006', 'T1566']);
let nodeUserStatus = storageGet('mitre_mindmap_status_v1', {});

// Viewport pan & zoom state (centered on 1800, 1400 stage center)
let vpScale = 0.82;
let vpPanX = -850;
let vpPanY = -750;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// =========================================================================
// 3. MIND MAP LAYOUT & RENDERER
// =========================================================================
function isNodeMatchingFilters(node) {
  if (node.id === 'ROOT') return true;
  if (currentDomainFilter !== 'all' && node.domain !== 'all' && node.domain !== currentDomainFilter) {
    return false;
  }
  if (currentSubdomainFilter !== 'all') {
    if (node.platforms && node.platforms.length > 0) {
      if (!node.platforms.includes(currentSubdomainFilter)) return false;
    } else if (node.children && node.children.length > 0) {
      const anyChildMatches = node.children.some(c => isNodeMatchingFilters(c));
      if (!anyChildMatches) return false;
    }
  }
  if (!currentSearchQuery) return true;
  const q = currentSearchQuery.toLowerCase();
  const selfMatch =
    (node.code && node.code.toLowerCase().includes(q)) ||
    (node.title && node.title.toLowerCase().includes(q)) ||
    (node.subtitle && node.subtitle.toLowerCase().includes(q)) ||
    (node.why && node.why.toLowerCase().includes(q)) ||
    (node.how && node.how.toLowerCase().includes(q));
  if (selfMatch) return true;
  if (node.children) {
    return node.children.some(c => isNodeMatchingFilters(c));
  }
  return false;
}

function isNodeHighlightedByApt(node) {
  if (currentAptOverlay === 'none') return false;
  const apt = APT_PROFILES[currentAptOverlay];
  if (!apt) return false;
  if (apt.techniques.includes(node.id) || apt.techniques.includes(node.code)) return true;
  if (node.children) {
    return node.children.some(c => apt.techniques.includes(c.id) || apt.techniques.includes(c.code));
  }
  return false;
}

function getBranchPalette(vNode) {
  const idx = (typeof vNode._branchIdx === 'number' ? vNode._branchIdx : 0) % BRANCH_PALETTES.length;
  return BRANCH_PALETTES[idx];
}

function assignRadialSpiderCoordinates(rootTree, centerX, centerY) {
  rootTree._x = centerX;
  rootTree._y = centerY;
  rootTree._angle = 0;

  const topChildren = rootTree.visibleChildren || [];
  const nTop = topChildren.length;
  if (nTop === 0) return;

  // Weight each branch by visible descendants so crowded branches get wider sectors
  function countVisibleWeight(node) {
    if (!node.visibleChildren || node.visibleChildren.length === 0) return 1.2;
    return Math.max(1.6, node.visibleChildren.reduce((acc, c) => acc + countVisibleWeight(c), 0) * 0.65);
  }

  const weights = topChildren.map(c => countVisibleWeight(c));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let currentAngle = -Math.PI * 0.85;
  topChildren.forEach((branch, i) => {
    branch._branchIdx = i;
    const sectorSpan = (weights[i] / totalWeight) * (Math.PI * 2);
    const midAngle = currentAngle + sectorSpan / 2;
    currentAngle += sectorSpan;

    const r1 = nTop > 8 ? 340 : 285;
    branch._angle = midAngle;
    branch._x = centerX + Math.cos(midAngle) * r1;
    branch._y = centerY + Math.sin(midAngle) * r1;

    layoutSubtreeFan(branch, midAngle, Math.min(sectorSpan * 0.92, Math.PI * 0.78), 1, i);
  });
}

function layoutSubtreeFan(parentNode, centerAngle, fanSpan, relDepth, branchIdx) {
  const children = parentNode.visibleChildren || [];
  const count = children.length;
  if (count === 0) return;

  // Multi-ring layout when a tactic or technique has many children
  const maxPerRing = relDepth === 1 ? 8 : (relDepth === 2 ? 7 : 6);
  const baseRadius = relDepth === 1 ? 235 : (relDepth === 2 ? 195 : 155);
  const ringGap = relDepth === 1 ? 120 : 105;

  children.forEach((ch, idx) => {
    ch._branchIdx = branchIdx;
    const ringIdx = Math.floor(idx / maxPerRing);
    const posInRing = idx % maxPerRing;
    const countInRing = Math.min(maxPerRing, count - ringIdx * maxPerRing);

    const effectiveSpan = countInRing === 1
      ? 0
      : Math.min(Math.PI * 1.15, Math.max(fanSpan, countInRing * 0.26));
    const ringOffset = (ringIdx % 2 === 1 && countInRing > 1) ? (effectiveSpan / countInRing) * 0.35 : 0;
    const startAngle = centerAngle - effectiveSpan / 2 + ringOffset;
    const frac = countInRing === 1 ? 0.5 : posInRing / (countInRing - 1);
    const angle = countInRing === 1 ? centerAngle : startAngle + frac * effectiveSpan;

    const stagger = (countInRing >= 5 && posInRing % 2 === 1) ? 28 : 0;
    const dist = baseRadius + ringIdx * ringGap + stagger;

    ch._angle = angle;
    ch._x = parentNode._x + Math.cos(angle) * dist;
    ch._y = parentNode._y + Math.sin(angle) * dist;

    const childSpan = Math.min(Math.PI * 0.55, Math.max(0.42, effectiveSpan / Math.max(1.5, countInRing * 0.65)));
    layoutSubtreeFan(ch, angle, childSpan, relDepth + 1, branchIdx);
  });
}

const DOMAIN_ROOTS = { enterprise: 'DOM-ENT', mobile: 'DOM-MOB', ics: 'DOM-ICS', cti: 'DOM-CTI', defense: 'DOM-DEF' };

function renderMindMap() {
  const svg = document.getElementById('mindmapSvg');
  const nodesLayer = document.getElementById('mindmapNodesLayer');
  const vp = document.getElementById('mindmapViewport');
  if (!svg || !nodesLayer) return;

  if (vp) {
    vp.classList.toggle('paper-theme', isPaperLightTheme && mindmapLayoutMode !== 'network');
    vp.classList.toggle('constellation-theme', !isPaperLightTheme || mindmapLayoutMode === 'network');
  }

  let activeRootSource = NODE_MAP.get('ROOT');
  if (currentDomainFilter !== 'all') {
    if (DOMAIN_ROOTS[currentDomainFilter] && NODE_MAP.has(DOMAIN_ROOTS[currentDomainFilter])) {
      activeRootSource = NODE_MAP.get(DOMAIN_ROOTS[currentDomainFilter]);
    }
  } else if (customCenterRootId !== 'ROOT' && NODE_MAP.has(customCenterRootId)) {
    activeRootSource = NODE_MAP.get(customCenterRootId);
  }

  const resetRootBtn = document.getElementById('resetCenterRootBtn');
  if (resetRootBtn) {
    resetRootBtn.classList.toggle('hidden', activeRootSource.id === 'ROOT' && currentDomainFilter === 'all');
  }

  function buildVisibleTree(node, isCurrentRoot = false) {
    if (!isCurrentRoot && !isNodeMatchingFilters(node)) return null;
    const copy = { ...node, visibleChildren: [] };
    const forceExpand = currentSearchQuery.length > 0;
    if (node.children && (isCurrentRoot || expandedNodes.has(node.id) || forceExpand)) {
      node.children.forEach(c => {
        const vc = buildVisibleTree(c, false);
        if (vc) copy.visibleChildren.push(vc);
      });
    }
    return copy;
  }

  const rootTree = buildVisibleTree(activeRootSource, true);
  if (!rootTree) return;

  const stage = document.getElementById('mindmapStage');

  if (mindmapLayoutMode === 'network' || mindmapLayoutMode === 'radial') {
    const centerX = 1800;
    const centerY = 1400;
    stage.style.width = '3600px';
    stage.style.height = '2800px';
    svg.setAttribute('width', '3600');
    svg.setAttribute('height', '2800');

    assignRadialSpiderCoordinates(rootTree, centerX, centerY);

    function applyOffsets(vNode) {
      if (customNodeOffsets.has(vNode.id)) {
        const off = customNodeOffsets.get(vNode.id);
        vNode._x += off.dx;
        vNode._y += off.dy;
      }
      (vNode.visibleChildren || []).forEach(applyOffsets);
    }
    applyOffsets(rootTree);

    const svgPaths = [];
    const htmlCards = [];

    function traverseRadial(vNode, relDepth = 0) {
      const hasTotalChildren = vNode.children && vNode.children.length > 0;
      const isExpanded = relDepth === 0 || expandedNodes.has(vNode.id) || currentSearchQuery.length > 0;
      const isSelected = selectedNodeId === vNode.id;
      const aptHit = isNodeHighlightedByApt(vNode);
      const status = nodeUserStatus[vNode.id] || 'none';
      const pal = getBranchPalette(vNode);

      if (vNode.visibleChildren && vNode.visibleChildren.length > 0) {
        vNode.visibleChildren.forEach(ch => {
          const chPal = getBranchPalette(ch);
          const dx = ch._x - vNode._x;
          const dy = ch._y - vNode._y;
          const c1x = vNode._x + dx * 0.42 - dy * 0.08;
          const c1y = vNode._y + dy * 0.42 + dx * 0.08;
          const c2x = vNode._x + dx * 0.72;
          const c2y = vNode._y + dy * 0.72;

          const childAptHit = isNodeHighlightedByApt(ch);
          const strokeColor = (aptHit && childAptHit) ? '#e11d48' : chPal.stroke;
          const strokeWidth = relDepth === 0 ? '3.2' : (relDepth === 1 ? '2.4' : '1.8');
          const strokeOpacity = (currentAptOverlay !== 'none' && !(aptHit && childAptHit)) ? '0.22' : '0.88';

          svgPaths.push(
            `<path d="M ${vNode._x} ${vNode._y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ch._x} ${ch._y}" class="mm-edge" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${strokeOpacity}" />`
          );
          traverseRadial(ch, relDepth + 1);
        });
      }

      const isCenter = relDepth === 0;
      const statusMark = status === 'mastered' ? '✓ ' : (status === 'detecting' ? '🛡 ' : (status === 'priority' ? '★ ' : ''));

      if (mindmapLayoutMode === 'network') {
        const orbDiameter = isCenter ? 68 : (relDepth === 1 ? 46 : (relDepth === 2 ? 32 : (relDepth === 3 ? 22 : 16)));
        const orbColor = aptHit ? '#f43f5e' : (isCenter ? '#6366f1' : pal.badgeBg);
        const ringStyle = isSelected
          ? `0 0 0 4px #fbbf24, 0 0 28px ${orbColor}`
          : `0 0 ${isCenter ? '30px' : '16px'} ${orbColor}88, inset 0 0 10px rgba(255,255,255,0.35)`;
        const labelFont = isCenter
          ? 'text-sm font-extrabold text-white'
          : (relDepth === 1 ? 'text-xs font-bold text-slate-100' : (relDepth === 2 ? 'text-[11px] font-semibold text-slate-200' : 'text-[10px] font-medium text-slate-300'));

        const expandIndicator = hasTotalChildren
          ? `<span style="background:#0f172a; border:1.5px solid ${orbColor}; color:#fff;" class="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[9px] font-mono font-bold shadow">${isExpanded ? '−' : '+'}${vNode.children.length}</span>`
          : '';

        htmlCards.push(`
          <div
            onclick="handleNodeClick('${vNode.id}', event)"
            ondblclick="setCustomCenterRoot('${vNode.id}', event)"
            onpointerdown="startNodeDrag('${vNode.id}', event)"
            style="left: ${vNode._x}px; top: ${vNode._y}px; z-index: ${isSelected ? 40 : (isCenter ? 30 : (25 - relDepth))};"
            class="net-orb-wrapper absolute flex flex-col items-center cursor-pointer select-none"
          >
            <div
              style="width: ${orbDiameter}px; height: ${orbDiameter}px; background: radial-gradient(circle at 32% 30%, #ffffff88, ${orbColor} 62%, #090d16 100%); box-shadow: ${ringStyle}; border: 2px solid rgba(255,255,255,0.65);"
              class="net-orb-circle relative rounded-full flex items-center justify-center ${aptHit ? 'apt-highlight' : ''}"
            >
              <span class="font-mono text-[9px] font-bold text-white drop-shadow">${relDepth <= 2 ? vNode.code.replace('ENTERPRISE', 'ENT') : ''}</span>
              ${expandIndicator}
            </div>
            <div class="net-label mt-1 text-center max-w-[165px] px-1.5 py-0.5 rounded bg-slate-950/70 backdrop-blur-[2px] border border-slate-800/60">
              <div class="${labelFont} leading-tight">${statusMark}${relDepth >= 3 ? `<span class="font-mono text-amber-300 mr-1">${vNode.code}</span>` : ''}${vNode.title}</div>
              ${relDepth >= 2 && vNode.subtitle ? `<div class="text-[9px] text-slate-400 line-clamp-1 mt-0.5">${vNode.subtitle}</div>` : ''}
            </div>
          </div>
        `);
        return;
      }

      // Spider pill mode
      const bgFill = isCenter
        ? (isPaperLightTheme ? '#dbeafe' : '#1e1b4b')
        : (isPaperLightTheme ? pal.lightBg : pal.darkBg);
      const textCol = isCenter
        ? (isPaperLightTheme ? '#1e3a8a' : '#ffffff')
        : (isPaperLightTheme ? pal.lightText : pal.darkText);
      const borderCol = aptHit ? '#e11d48' : (isCenter ? '#2563eb' : pal.border);
      const borderWidth = isCenter ? '3.5px' : (relDepth === 1 ? '2.6px' : '2px');
      const shadowStyle = isSelected
        ? `0 0 0 4px rgba(245, 158, 11, 0.55), 0 10px 22px rgba(0,0,0,0.22)`
        : `0 5px 14px rgba(15, 23, 42, ${isPaperLightTheme ? '0.14' : '0.45'})`;

      const maxW = isCenter ? '260px' : (relDepth === 1 ? '220px' : (relDepth === 2 ? '215px' : '210px'));
      const padCls = isCenter ? 'px-4 py-3' : (relDepth === 1 ? 'px-3.5 py-2' : 'px-3 py-1.5');
      const titleSize = isCenter ? 'text-sm font-extrabold' : (relDepth === 1 ? 'text-xs font-bold' : 'text-[11px] font-semibold');

      const countBadge = hasTotalChildren
        ? `<span onclick="toggleNodeExpand('${vNode.id}', event)" title="${isExpanded ? 'คลิกเพื่อหุบหัวข้อย่อย' : 'คลิกเพื่อกระจายหัวข้อย่อย'}" style="background:${isCenter ? '#2563eb' : pal.badgeBg}; color:#fff;" class="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-sm hover:scale-110 transition-transform">${isExpanded ? '−' : '+'}${vNode.children.length}</span>`
        : '';

      htmlCards.push(`
        <div
          onclick="handleNodeClick('${vNode.id}', event)"
          ondblclick="setCustomCenterRoot('${vNode.id}', event)"
          onpointerdown="startNodeDrag('${vNode.id}', event)"
          style="left: ${vNode._x}px; top: ${vNode._y}px; max-width: ${maxW}; background-color: ${bgFill}; color: ${textCol}; border: ${borderWidth} solid ${borderCol}; box-shadow: ${shadowStyle}; z-index: ${isCenter ? 25 : (20 - relDepth)};"
          class="mm-node spider-bubble absolute rounded-2xl ${padCls} cursor-pointer select-none ${aptHit ? 'apt-highlight' : ''}"
        >
          <div class="flex items-center justify-between gap-1">
            <span class="font-mono text-[10px] font-bold opacity-80">${statusMark}${vNode.code}</span>
            <div class="flex items-center gap-0.5">
              ${!isCenter && hasTotalChildren ? `<button onclick="setCustomCenterRoot('${vNode.id}', event)" title="ตั้งหัวข้อนี้เป็นจุดศูนย์กลาง" class="text-[10px] opacity-65 hover:opacity-100 px-1">🎯</button>` : ''}
              ${countBadge}
            </div>
          </div>
          <div class="${titleSize} leading-snug break-words">${vNode.title}</div>
          ${relDepth >= 2 && vNode.subtitle ? `<div class="text-[10px] opacity-75 line-clamp-2 mt-0.5">${vNode.subtitle}</div>` : ''}
          ${isCenter ? `<div class="text-[10px] opacity-80 mt-0.5 leading-tight">คลิกหัวข้อใหญ่เพื่อกระจายหัวข้อย่อย • ดับเบิลคลิกเพื่อตั้งเป็นศูนย์กลาง</div>` : ''}
        </div>
      `);
    }

    const visibleFlat = [];
    function collectVisible(vn) {
      visibleFlat.push(vn);
      (vn.visibleChildren || []).forEach(collectVisible);
    }
    collectVisible(rootTree);

    // Faint cross-links between techniques used by the same APT group
    if (mindmapLayoutMode === 'network') {
      Object.values(APT_PROFILES).forEach((apt, aIdx) => {
        const matchedNodes = visibleFlat.filter(vn => apt.techniques.includes(vn.id) || apt.techniques.includes(vn.code));
        for (let i = 0; i < matchedNodes.length - 1; i++) {
          const n1 = matchedNodes[i];
          const n2 = matchedNodes[i + 1];
          const midX = (n1._x + n2._x) / 2 + (aIdx % 2 === 0 ? 45 : -45);
          const midY = (n1._y + n2._y) / 2 - (aIdx % 2 === 0 ? 45 : -45);
          const isOverlayThis = currentAptOverlay !== 'none' && APT_PROFILES[currentAptOverlay] === apt;
          svgPaths.push(
            `<path d="M ${n1._x} ${n1._y} Q ${midX} ${midY}, ${n2._x} ${n2._y}" fill="none" stroke="${isOverlayThis ? '#f43f5e' : '#64748b'}" stroke-width="${isOverlayThis ? '2.2' : '0.85'}" stroke-dasharray="${isOverlayThis ? 'none' : '4 4'}" opacity="${isOverlayThis ? '0.85' : '0.24'}" />`
          );
        }
      });
    }

    traverseRadial(rootTree, 0);
    svg.innerHTML = svgPaths.join('');
    nodesLayer.innerHTML = htmlCards.join('');
    applyViewportTransform();
    return;
  }

  // Horizontal tree layout
  const levelWidths = [310, 340, 360, 370, 340];
  const vGap = 18;
  const nodeHeight = 82;

  let currentLeafY = 70;
  function assignCoordinates(vNode, depth) {
    const x = 60 + depth * (levelWidths[Math.min(depth, 4)] || 350);
    vNode._x = x;
    if (!vNode.visibleChildren || vNode.visibleChildren.length === 0) {
      vNode._y = currentLeafY;
      currentLeafY += nodeHeight + vGap;
    } else {
      vNode.visibleChildren.forEach(ch => assignCoordinates(ch, depth + 1));
      const firstY = vNode.visibleChildren[0]._y;
      const lastY = vNode.visibleChildren[vNode.visibleChildren.length - 1]._y;
      vNode._y = (firstY + lastY) / 2;
    }
  }

  assignCoordinates(rootTree, 0);

  const stageHeight = Math.max(1600, currentLeafY + 160);
  stage.style.height = stageHeight + 'px';
  svg.setAttribute('height', stageHeight);

  const svgPaths = [];
  const htmlCards = [];

  function traverseRender(vNode) {
    const hasTotalChildren = vNode.children && vNode.children.length > 0;
    const isExpanded = expandedNodes.has(vNode.id) || currentSearchQuery.length > 0;
    const isSelected = selectedNodeId === vNode.id;
    const aptHit = isNodeHighlightedByApt(vNode);
    const pal = getBranchPalette(vNode);
    const cardWidth = vNode.nodeType === 'root' ? 275 : 290;

    const bgFill = isPaperLightTheme ? pal.lightBg : '#0f172a';
    const textCol = isPaperLightTheme ? pal.lightText : '#f8fafc';
    const borderCol = isSelected ? '#f59e0b' : (aptHit ? '#e11d48' : pal.border);

    htmlCards.push(`
      <div
        onclick="handleNodeClick('${vNode.id}', event)"
        style="left: ${vNode._x}px; top: ${vNode._y}px; width: ${cardWidth}px; background-color: ${bgFill}; color: ${textCol}; border: 2.2px solid ${borderCol};"
        class="mm-node absolute rounded-2xl p-2.5 cursor-pointer select-none shadow-md"
      >
        <div class="flex items-center justify-between gap-1.5 mb-1">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold" style="background:${pal.badgeBg}; color:#fff;">${vNode.code}</span>
          ${hasTotalChildren ? `
            <button
              onclick="toggleNodeExpand('${vNode.id}', event)"
              class="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-white"
              style="background:${pal.badgeBg};"
            >
              ${isExpanded ? '−' : '+'}${vNode.children.length}
            </button>
          ` : ''}
        </div>
        <div class="text-xs font-bold truncate">${vNode.title}</div>
        <div class="text-[11px] opacity-75 truncate mt-0.5">${vNode.subtitle || ''}</div>
      </div>
    `);

    if (vNode.visibleChildren && vNode.visibleChildren.length > 0) {
      const startX = vNode._x + cardWidth;
      const startY = vNode._y + 38;
      vNode.visibleChildren.forEach(ch => {
        const endX = ch._x;
        const endY = ch._y + 38;
        const ctrlX1 = startX + (endX - startX) * 0.48;
        const ctrlX2 = startX + (endX - startX) * 0.52;
        const chPal = getBranchPalette(ch);
        svgPaths.push(
          `<path d="M ${startX} ${startY} C ${ctrlX1} ${startY}, ${ctrlX2} ${endY}, ${endX} ${endY}" class="mm-edge" stroke="${chPal.stroke}" stroke-width="2.2" opacity="0.82" />`
        );
        traverseRender(ch);
      });
    }
  }

  traverseRender(rootTree);
  svg.innerHTML = svgPaths.join('');
  nodesLayer.innerHTML = htmlCards.join('');
  applyViewportTransform();
}

function applyViewportTransform() {
  const stage = document.getElementById('mindmapStage');
  const badge = document.getElementById('zoomLevelBadge');
  if (stage) {
    stage.style.transform = `translate(${vpPanX}px, ${vpPanY}px) scale(${vpScale})`;
  }
  if (badge) {
    badge.textContent = Math.round(vpScale * 100) + '%';
  }
}

function zoomMindmap(factor) {
  const vp = document.getElementById('mindmapViewport');
  const rect = vp ? vp.getBoundingClientRect() : { width: 900, height: 650 };
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const newScale = Math.min(1.85, Math.max(0.28, vpScale * factor));
  const ratio = newScale / vpScale;
  vpPanX = cx - (cx - vpPanX) * ratio;
  vpPanY = cy - (cy - vpPanY) * ratio;
  vpScale = newScale;
  applyViewportTransform();
}

function resetMindmapViewport() {
  const vp = document.getElementById('mindmapViewport');
  const rect = vp ? vp.getBoundingClientRect() : { width: 960, height: 680 };
  if (mindmapLayoutMode === 'radial' || mindmapLayoutMode === 'network') {
    vpScale = 0.78;
    vpPanX = (rect.width / 2) - 1800 * vpScale;
    vpPanY = (rect.height / 2) - 1400 * vpScale;
  } else {
    vpScale = 0.88;
    vpPanX = 36;
    vpPanY = 36;
  }
  applyViewportTransform();
}

function toggleMindmapLayout() {
  if (mindmapLayoutMode === 'network') {
    mindmapLayoutMode = 'radial';
    isPaperLightTheme = true;
  } else if (mindmapLayoutMode === 'radial') {
    mindmapLayoutMode = 'tree';
  } else {
    mindmapLayoutMode = 'network';
    isPaperLightTheme = false;
  }
  const btn = document.getElementById('layoutToggleBtn');
  if (btn) {
    btn.textContent =
      mindmapLayoutMode === 'network' ? '🌌 โหมด Network Mapping (วงกลมเครือข่าย)' :
      mindmapLayoutMode === 'radial' ? '🕸 โหมดกระจาย 360° (Spider Pill)' :
      '🌿 โหมดเรียงซ้าย-ขวา (Tree)';
  }
  updatePaperThemeButton();
  resetMindmapViewport();
  renderMindMap();
  showToast(
    mindmapLayoutMode === 'network' ? 'โหมด Network Mapping (กราฟวงกลมเชื่อมโยง)' :
    mindmapLayoutMode === 'radial' ? 'โหมด Spider Pill (กล่องมนกระจาย 360°)' :
    'โหมดแผนผังเรียงซ้ายไปขวา (Tree)'
  );
}

function updatePaperThemeButton() {
  const btn = document.getElementById('paperThemeBtn');
  if (btn) {
    btn.textContent = isPaperLightTheme ? '☀️ พื้นขาวสีสด' : '🌙 พื้นมืด Constellation';
  }
}

function togglePaperTheme() {
  isPaperLightTheme = !isPaperLightTheme;
  updatePaperThemeButton();
  renderMindMap();
}

function setCustomCenterRoot(nodeId, ev) {
  if (ev) ev.stopPropagation();
  const node = NODE_MAP.get(nodeId);
  if (!node) return;
  customCenterRootId = nodeId;
  currentDomainFilter = 'all';
  expandedNodes.add(nodeId);
  selectedNodeId = nodeId;
  customNodeOffsets.clear();
  resetMindmapViewport();
  renderMindMap();
  renderInspector(node);
  showToast(`ตั้ง "${node.title}" เป็นจุดศูนย์กลางแผนผังแล้ว`);
}

function collapseAllToMainTopics() {
  expandedNodes.clear();
  expandedNodes.add('ROOT');
  expandedNodes.add(customCenterRootId);
  customNodeOffsets.clear();
  renderMindMap();
  resetMindmapViewport();
  showToast('หุบเหลือเฉพาะหัวข้อใหญ่เรียบร้อย — คลิกหัวข้อใหญ่เพื่อกระจายหัวข้อย่อยได้เลย');
}

// Individual node dragging (with a click threshold so a click still toggles expansion)
let draggingNodeId = null;
let nodeDragStartX = 0;
let nodeDragStartY = 0;
let nodeDidMove = false;

function startNodeDrag(nodeId, ev) {
  if (ev.button !== undefined && ev.button !== 0) return;
  if (ev.target.closest('button')) return;
  ev.stopPropagation();
  draggingNodeId = nodeId;
  nodeDragStartX = ev.clientX;
  nodeDragStartY = ev.clientY;
  nodeDidMove = false;

  const onMove = (moveEv) => {
    if (!draggingNodeId) return;
    const dxScreen = moveEv.clientX - nodeDragStartX;
    const dyScreen = moveEv.clientY - nodeDragStartY;
    if (Math.hypot(dxScreen, dyScreen) > 6) {
      nodeDidMove = true;
      const prev = customNodeOffsets.get(draggingNodeId) || { dx: 0, dy: 0 };
      customNodeOffsets.set(draggingNodeId, {
        dx: prev.dx + dxScreen / vpScale,
        dy: prev.dy + dyScreen / vpScale
      });
      nodeDragStartX = moveEv.clientX;
      nodeDragStartY = moveEv.clientY;
      renderMindMap();
    }
  };

  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    setTimeout(() => { draggingNodeId = null; }, 0);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function expandToLevel(maxDepth) {
  expandedNodes.clear();
  expandedNodes.add('ROOT');
  expandedNodes.add(customCenterRootId);
  if (maxDepth <= 2) {
    NODE_MAP.forEach(node => {
      if (node._depth < maxDepth) expandedNodes.add(node.id);
    });
    renderMindMap();
    showToast('แสดงระดับ Domain และ Tactics ทั้งหมดเรียบร้อยแล้ว');
  } else if (maxDepth === 3) {
    const centerNode = NODE_MAP.get(customCenterRootId) || NODE_MAP.get('DOM-ENT');
    if (centerNode && centerNode.children) {
      centerNode.children.forEach(tac => expandedNodes.add(tac.id));
    }
    renderMindMap();
    showToast('กาง Techniques ทั้งหมดในหมวดหลักเรียบร้อยแล้ว');
  } else {
    const sel = NODE_MAP.get(selectedNodeId) || NODE_MAP.get('TA0043');
    let cur = sel;
    while (cur && cur._parentId) {
      expandedNodes.add(cur._parentId);
      cur = NODE_MAP.get(cur._parentId);
    }
    function expandSubtree(n, limitDepth) {
      if (!n || limitDepth <= 0) return;
      expandedNodes.add(n.id);
      if (n.children) n.children.forEach(c => expandSubtree(c, limitDepth - 1));
    }
    expandSubtree(sel, 3);
    renderMindMap();
    showToast(`กางโหนดย่อยลึกสุดของ "${sel ? sel.code : 'TA0043'}" เรียบร้อยแล้ว`);
  }
}

function toggleNodeExpand(nodeId, ev) {
  if (ev) ev.stopPropagation();
  if (expandedNodes.has(nodeId)) {
    expandedNodes.delete(nodeId);
  } else {
    expandedNodes.add(nodeId);
  }
  selectedNodeId = nodeId;
  renderMindMap();
  renderInspector(NODE_MAP.get(nodeId));
}

function handleNodeClick(nodeId, ev) {
  if (ev) ev.stopPropagation();
  if (nodeDidMove) {
    nodeDidMove = false;
    return;
  }
  selectedNodeId = nodeId;
  const node = NODE_MAP.get(nodeId);
  if (node && node.children && node.children.length > 0 && nodeId !== customCenterRootId && nodeId !== 'ROOT') {
    if (expandedNodes.has(nodeId)) {
      expandedNodes.delete(nodeId);
    } else {
      expandedNodes.add(nodeId);
    }
  }
  renderMindMap();
  renderInspector(node);
}

// =========================================================================
// 4. INSPECTOR PANEL
// =========================================================================
function renderInspector(node) {
  if (!node) return;
  document.getElementById('inspBadgeId').textContent = node.code || node.id;
  document.getElementById('inspCategoryTag').textContent =
    node.nodeType === 'root' ? 'Framework Root' :
    node.nodeType === 'domain' ? 'MITRE Matrix Domain' :
    node.nodeType === 'tactic' ? 'Tactic (เป้าหมายของผู้โจมตี - Why)' :
    node.nodeType === 'subtechnique' ? 'Sub-Technique (วิธีการย่อย)' :
    node.nodeType === 'detail' ? 'Detail / Note' :
    'Technique & Sub-Techniques (วิธีการโจมตี - How)';
  document.getElementById('inspOfficialLink').href = node.url || 'https://attack.mitre.org/';

  const currentStatus = nodeUserStatus[node.id] || 'none';

  const matchingApts = Object.entries(APT_PROFILES).filter(([, apt]) =>
    apt.techniques.includes(node.id) || apt.techniques.includes(node.code)
  );

  // Resolve each listed sub-technique to its real child node (techniques repeated under
  // several tactics have prefixed child IDs such as "TA0003-T1098.001").
  const subListHtml = (node.subtechniques && node.subtechniques.length)
    ? `<div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
         <div class="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-2">Sub-Techniques &amp; รูปแบบย่อย (คลิกเพื่อเจาะลึก)</div>
         <div class="flex flex-wrap gap-1.5">
           ${node.subtechniques.map((st, idx) => {
             const subMatch = st.match(/^(T\d{4})\.(\d{3})\b/);
             const subCode = subMatch ? `${subMatch[1]}.${subMatch[2]}` : null;
             const kids = node.children || [];
             const subChild = (subCode && kids.find(c => c.code === subCode)) || kids[idx];
             const subNodeId = subChild ? subChild.id : node.id;
             return `<button onclick="selectAndFocusNode('${subNodeId}')" class="px-2 py-1 rounded-lg bg-slate-900 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-500/50 text-[11px] font-mono text-slate-200 hover:text-indigo-200 transition-colors flex items-center gap-1"><span>${st}</span><span class="text-[10px] text-emerald-400">🔍 เจาะลึก</span></button>`;
           }).join('')}
         </div>
       </div>`
    : '';

  const childListHtml = (node.children && node.children.length)
    ? `<div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
         <div class="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2">โหนดลูกในหมวดนี้ (${node.children.length} รายการ)</div>
         <div class="space-y-1.5 max-h-48 overflow-y-auto custom-scroll pr-1">
           ${node.children.map(ch => `
             <button onclick="selectAndFocusNode('${ch.id}')" class="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-between gap-2 transition-colors">
               <div class="min-w-0">
                 <span class="font-mono font-bold text-indigo-300 mr-1.5">${ch.code}</span>
                 <span class="text-slate-200 font-medium">${ch.title}</span>
               </div>
               <span class="text-[10px] text-slate-400 shrink-0">ดูข้อมูล →</span>
             </button>
           `).join('')}
         </div>
       </div>`
    : '';

  const aptHtml = matchingApts.length
    ? `<div class="bg-rose-950/25 border border-rose-500/30 rounded-xl p-3">
         <div class="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-2">กลุ่ม APT / แรนซัมแวร์ที่ใช้เทคนิคนี้</div>
         <div class="flex flex-wrap gap-1.5">
           ${matchingApts.map(([key, a]) => `
             <button onclick="setAptOverlay('${key}')" class="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-[11px] text-rose-200 transition-colors">
               🎯 ${a.name}
             </button>
           `).join('')}
         </div>
       </div>`
    : '';

  const body = document.getElementById('inspectorBody');
  const officialUrl = node.url || 'https://attack.mitre.org/';
  body.innerHTML = `
    <div>
      <h2 class="text-base font-bold text-white leading-snug">${node.title}</h2>
      <p class="text-xs text-slate-400 mt-0.5">${node.subtitle || ''}</p>
      ${(node.platforms && node.platforms.length) ? `
        <div class="mt-2 flex flex-wrap items-center gap-1">
          <span class="text-[10px] text-amber-300 font-semibold mr-1">🌐 Sub-Domains:</span>
          ${node.platforms.map(p => `<button onclick="setSubdomainFilter('${p}')" class="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-[10px] text-amber-200 transition-colors">${p}</button>`).join('')}
        </div>
      ` : ''}
      <div class="mt-2 flex items-center justify-between gap-2 bg-indigo-950/30 border border-indigo-500/30 rounded-xl px-2.5 py-1.5">
        <a href="${officialUrl}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-mono text-indigo-300 hover:text-white truncate underline">${officialUrl}</a>
        <button onclick="copyOfficialUrl('${officialUrl}')" class="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-[10px] text-indigo-200 hover:text-white shrink-0 transition-colors">คัดลอกลิงก์</button>
      </div>
    </div>

    <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
      <span class="text-[11px] text-slate-400 font-medium">สถานะของคุณ:</span>
      <div class="flex flex-wrap items-center gap-1">
        <button onclick="setNodeStatus('${node.id}', 'none')" class="px-2 py-1 rounded text-[11px] ${currentStatus === 'none' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}">ทั่วไป</button>
        <button onclick="setNodeStatus('${node.id}', 'mastered')" class="px-2 py-1 rounded text-[11px] ${currentStatus === 'mastered' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-emerald-400 hover:bg-emerald-950'}">✓ ศึกษาแล้ว</button>
        <button onclick="setNodeStatus('${node.id}', 'detecting')" class="px-2 py-1 rounded text-[11px] ${currentStatus === 'detecting' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-cyan-400 hover:bg-cyan-950'}">🛡 มีกฎตรวจจับ</button>
        <button onclick="setNodeStatus('${node.id}', 'priority')" class="px-2 py-1 rounded text-[11px] ${currentStatus === 'priority' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-rose-400 hover:bg-rose-950'}">★ สำคัญสูง</button>
      </div>
    </div>

    <div class="space-y-2.5">
      <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
        <div class="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1">เป้าหมายเชิงยุทธวิธี (Why / Objective)</div>
        <p class="text-slate-200 leading-relaxed">${node.why || '-'}</p>
      </div>
      <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
        <div class="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">กลไกและวิธีการลงมือ (How / Mechanism)</div>
        <p class="text-slate-200 leading-relaxed">${node.how || '-'}</p>
      </div>
    </div>

    ${subListHtml}

    <div class="grid grid-cols-1 gap-2.5">
      <div class="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3">
        <div class="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-1">⚔ มุมมอง Red Team / Offensive Security</div>
        <p class="text-slate-200 leading-relaxed">${node.redTeam || '-'}</p>
      </div>
      <div class="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3">
        <div class="text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-1">🛡 มุมมอง Blue Team / SOC Detection &amp; Response</div>
        <p class="text-slate-200 leading-relaxed">${node.blueTeam || '-'}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
        <div class="text-[11px] font-bold text-sky-300 uppercase tracking-wider mb-1.5">Data Sources (แหล่ง Log)</div>
        <ul class="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
          ${(node.dataSources || []).map(ds => `<li>${ds}</li>`).join('')}
        </ul>
      </div>
      <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
        <div class="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">Mitigations (การป้องกัน)</div>
        <ul class="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
          ${(node.mitigations || []).map(m => `<li>${m}</li>`).join('')}
        </ul>
      </div>
    </div>

    ${aptHtml}
    ${childListHtml}

    <div class="bg-indigo-950/25 border border-indigo-500/30 rounded-xl p-3 space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-1">
        <span class="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">➕ เพิ่ม/แก้ไขเนื้อหา หรือแตกโหนดย่อยของ ${node.code}</span>
        <span class="text-[10px] text-slate-400">บันทึกไว้ในเบราว์เซอร์นี้เท่านั้น</span>
      </div>
      <div class="space-y-2">
        <input id="customSubTitleInput" type="text" placeholder="หัวข้อโหนดย่อยใหม่ / ประเด็นเพิ่มเติม (เช่น Playbook ตรวจจับ ${node.code})" class="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none" />
        <textarea id="customSubBodyInput" rows="2" placeholder="รายละเอียดเนื้อหา / คำสั่ง Red Team / กฎ SIEM สำหรับ ${node.code}..." class="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none resize-none"></textarea>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="addCustomSubNode('${node.id}')" class="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
            + แตกโหนดย่อยใหม่ใต้ ${node.code}
          </button>
          <button onclick="appendCustomContentToNode('${node.id}')" class="px-3 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 text-xs font-medium transition-colors">
            อัปเดตเนื้อหาโหนดนี้
          </button>
        </div>
      </div>
    </div>
  `;
}

function addCustomSubNode(parentId) {
  const parent = NODE_MAP.get(parentId);
  if (!parent) return;
  const titleEl = document.getElementById('customSubTitleInput');
  const bodyEl = document.getElementById('customSubBodyInput');
  const title = escapeHtml((titleEl ? titleEl.value.trim() : '') || `เนื้อหาเพิ่มเติมของ ${parent.code}`);
  const body = escapeHtml((bodyEl ? bodyEl.value.trim() : '') || 'รายละเอียดเพิ่มเติมที่ผู้ใช้บันทึกไว้');

  if (!customUserEdits[parent.id]) customUserEdits[parent.id] = {};
  if (!customUserEdits[parent.id].customNotes) customUserEdits[parent.id].customNotes = [];
  customUserEdits[parent.id].customNotes.push({ title, body });
  storageSet('mitre_custom_edits_v1', customUserEdits);

  if (!parent.children) parent.children = [];
  const newId = `${parent.id}-USER-${customUserEdits[parent.id].customNotes.length}`;
  const newChild = makeCustomChild(parent, newId, title, body);
  parent.children.push(newChild);
  indexNodes(MINDMAP_DATA);
  expandedNodes.add(parent.id);
  selectedNodeId = newId;

  renderMindMap();
  renderInspector(newChild);
  showToast(`เพิ่มโหนดย่อยใต้ ${parent.code} เรียบร้อยแล้ว`);
}

function appendCustomContentToNode(nodeId) {
  const node = NODE_MAP.get(nodeId);
  if (!node) return;
  const titleEl = document.getElementById('customSubTitleInput');
  const bodyEl = document.getElementById('customSubBodyInput');
  const title = titleEl ? titleEl.value.trim() : '';
  const body = bodyEl ? bodyEl.value.trim() : '';
  if (!title && !body) {
    showToast('กรอกหัวข้อหรือรายละเอียดที่ต้องการเพิ่มก่อน');
    return;
  }
  if (title) node.subtitle = escapeHtml(title);
  if (body) node.how = (node.how ? node.how + ' | ' : '') + escapeHtml(body);
  if (!customUserEdits[nodeId]) customUserEdits[nodeId] = {};
  if (title) customUserEdits[nodeId].subtitle = node.subtitle;
  if (body) customUserEdits[nodeId].how = node.how;
  storageSet('mitre_custom_edits_v1', customUserEdits);
  renderMindMap();
  renderInspector(node);
  showToast(`อัปเดตเนื้อหาของ ${node.code} เรียบร้อยแล้ว`);
}

function selectAndFocusNode(nodeId) {
  const node = NODE_MAP.get(nodeId);
  if (!node) return;
  let cur = node;
  while (cur && cur._parentId) {
    expandedNodes.add(cur._parentId);
    cur = NODE_MAP.get(cur._parentId);
  }
  selectedNodeId = nodeId;
  renderMindMap();
  renderInspector(node);
}

function setNodeStatus(nodeId, status) {
  nodeUserStatus[nodeId] = status;
  storageSet('mitre_mindmap_status_v1', nodeUserStatus);
  renderMindMap();
  renderInspector(NODE_MAP.get(nodeId));
  if (currentMainView === 'matrix') renderMatrixView();
  showToast('บันทึกสถานะของโหนดเรียบร้อยแล้ว');
}

// =========================================================================
// 5. MATRIX, APT & PLAYBOOK VIEWS
// =========================================================================
function setMatrixPlatform(platform) {
  currentMatrixPlatform = platform;
  ['enterprise', 'mobile', 'ics'].forEach(p => {
    const btn = document.getElementById('matBtn' + p.charAt(0).toUpperCase() + p.slice(1));
    if (btn) {
      btn.className = p === platform
        ? 'px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600 text-white'
        : 'px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:text-white';
    }
  });
  renderMatrixView();
}

function renderMatrixView() {
  const container = document.getElementById('matrixGridContainer');
  if (!container) return;

  const domainId = currentMatrixPlatform === 'enterprise' ? 'DOM-ENT' : (currentMatrixPlatform === 'mobile' ? 'DOM-MOB' : 'DOM-ICS');
  const domainNode = NODE_MAP.get(domainId);
  if (!domainNode || !domainNode.children) return;

  container.innerHTML = domainNode.children.map(tactic => {
    const techniques = (tactic.children || []).filter(t => isNodeMatchingFilters(t));
    if (currentSubdomainFilter !== 'all' && techniques.length === 0) return '';
    return `
      <div class="w-64 shrink-0 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
        <div onclick="selectAndFocusNode('${tactic.id}')" class="p-3 bg-slate-950/90 border-b border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors">
          <div class="flex items-center justify-between gap-1">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">${tactic.code}</span>
            <span class="text-[10px] text-slate-400">${techniques.length} Techniques</span>
          </div>
          <div class="text-xs font-bold text-white mt-1.5">${tactic.title}</div>
          <div class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${tactic.subtitle}</div>
        </div>
        <div class="p-2.5 space-y-2 flex-1">
          ${techniques.map(tech => {
            const aptHit = isNodeHighlightedByApt(tech);
            const status = nodeUserStatus[tech.id] || 'none';
            const borderCls = aptHit
              ? 'border-rose-500 bg-rose-950/30'
              : (selectedNodeId === tech.id ? 'border-amber-400 bg-slate-800' : 'border-slate-800 bg-slate-950/80 hover:border-indigo-500/60');
            return `
              <div onclick="selectAndFocusNode('${tech.id}')" class="p-2.5 rounded-xl border ${borderCls} cursor-pointer transition-all">
                <div class="flex items-center justify-between gap-1 mb-1">
                  <span class="font-mono text-[10px] font-bold text-emerald-300">${tech.code}</span>
                  ${aptHit ? '<span class="text-[10px] text-rose-300 font-semibold">🎯 APT Match</span>' : ''}
                  ${status === 'detecting' ? '<span class="text-[10px] text-cyan-300">🛡</span>' : ''}
                </div>
                <div class="text-xs font-semibold text-slate-100">${tech.title}</div>
                <div class="text-[11px] text-slate-400 mt-0.5 line-clamp-2">${tech.subtitle}</div>
                ${tech.subtechniques && tech.subtechniques.length ? `<div class="mt-1.5 text-[10px] text-slate-500 font-mono">${tech.subtechniques.length} Sub-techniques</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderAptView() {
  const grid = document.getElementById('aptCardsGrid');
  if (!grid) return;

  grid.innerHTML = Object.entries(APT_PROFILES).map(([key, apt]) => {
    const isCurrent = currentAptOverlay === key;
    return `
      <div class="bg-slate-900/90 border ${isCurrent ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-slate-800'} rounded-2xl p-4 flex flex-col justify-between gap-3">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">${apt.id}</span>
            <a href="${apt.url}" target="_blank" rel="noopener noreferrer" class="text-[11px] text-indigo-300 hover:underline">ข้อมูลทางการ MITRE ↗</a>
          </div>
          <h3 class="text-sm font-bold text-white">${apt.name}</h3>
          <p class="text-[11px] text-amber-300 font-medium">เป้าหมายหลัก: ${apt.target}</p>
          <p class="text-xs text-slate-300 leading-relaxed">${apt.summary}</p>
          <div class="pt-1">
            <div class="text-[11px] text-slate-400 mb-1">Techniques ที่ใช้ใน Kill Chain (${apt.techniques.length} รายการ):</div>
            <div class="flex flex-wrap gap-1">
              ${apt.techniques.map(tid => `
                <button onclick="selectAndFocusNode('${tid}'); switchMainView('mindmap');" class="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-indigo-950 border border-slate-800 text-[10px] font-mono text-emerald-300">${tid}</button>
              `).join('')}
            </div>
          </div>
        </div>
        <button onclick="setAptOverlay('${key}'); switchMainView('mindmap');" class="w-full py-2 rounded-xl text-xs font-semibold transition-all ${isCurrent ? 'bg-rose-600 text-white' : 'bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30'}">
          ${isCurrent ? 'กำลังแสดงเส้นทางบน Mind Map' : 'จำลองเส้นทางโจมตีบน Mind Map'}
        </button>
      </div>
    `;
  }).join('');
}

function renderPlaybookView() {
  const grid = document.getElementById('playbookCardsGrid');
  if (!grid) return;

  grid.innerHTML = PLAYBOOK_DATA.map(pb => `
    <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">${pb.badge}</span>
        <a href="${pb.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-300 hover:underline">เอกสารอ้างอิง MITRE ↗</a>
      </div>
      <h3 class="text-sm font-bold text-white">${pb.role}</h3>
      <p class="text-xs text-slate-300 leading-relaxed">${pb.summary}</p>
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
        <div class="text-[11px] font-bold text-emerald-300 uppercase">แนวทางปฏิบัติ (Actionable Steps)</div>
        <ul class="space-y-1.5 text-xs text-slate-200 leading-relaxed">
          ${pb.steps.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');
}

// =========================================================================
// 6. VIEW SWITCHING, FILTERS, DATABASE TABLE & SEARCH
// =========================================================================
function switchMainView(viewName) {
  currentMainView = viewName;
  const views = { mindmap: 'viewMindmap', matrix: 'viewMatrix', groups: 'viewGroups', playbook: 'viewPlaybook', database: 'viewDatabase' };
  const tabs = { mindmap: 'tabBtnMindmap', matrix: 'tabBtnMatrix', groups: 'tabBtnGroups', playbook: 'tabBtnPlaybook', database: 'tabBtnDatabase' };

  Object.entries(views).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', k !== viewName);
  });

  Object.entries(tabs).forEach(([k, id]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.className = k === viewName
        ? 'px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 bg-indigo-600 text-white shadow shrink-0'
        : 'px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0';
    }
  });

  if (viewName === 'mindmap') renderMindMap();
  if (viewName === 'matrix') renderMatrixView();
  if (viewName === 'groups') renderAptView();
  if (viewName === 'playbook') renderPlaybookView();
  if (viewName === 'database') renderDatabaseView();
}

function setDomainFilter(domain) {
  currentDomainFilter = domain;
  document.querySelectorAll('.domain-chip').forEach(btn => {
    const active = btn.getAttribute('data-domain') === domain;
    btn.className = active
      ? 'domain-chip px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-medium transition-all'
      : 'domain-chip px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 transition-all';
  });
  if (DOMAIN_ROOTS[domain]) {
    expandedNodes.add('ROOT');
    expandedNodes.add(DOMAIN_ROOTS[domain]);
    selectedNodeId = DOMAIN_ROOTS[domain];
    renderInspector(NODE_MAP.get(DOMAIN_ROOTS[domain]));
  }
  renderMindMap();
  if (currentMainView === 'matrix') renderMatrixView();
  if (currentMainView === 'database') renderDatabaseView();
}

function setSubdomainFilter(subdomain) {
  currentSubdomainFilter = subdomain;
  document.querySelectorAll('.subdomain-chip').forEach(btn => {
    const active = btn.getAttribute('data-subdomain') === subdomain;
    btn.className = active
      ? 'subdomain-chip px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/50 font-semibold transition-all'
      : 'subdomain-chip px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition-all';
  });
  if (subdomain !== 'all') {
    const sdMeta = MITRE_FULL_DB.subdomains.find(s => s.id === subdomain);
    if (sdMeta) {
      currentDomainFilter = sdMeta.domain;
      const domMap = { enterprise: 'DOM-ENT', mobile: 'DOM-MOB', ics: 'DOM-ICS' };
      if (domMap[sdMeta.domain]) {
        customCenterRootId = domMap[sdMeta.domain];
        expandedNodes.add(customCenterRootId);
      }
      if (currentMainView === 'matrix') {
        setMatrixPlatform(sdMeta.domain);
      }
    }
    showToast(`กรองเฉพาะ Sub-domain: ${subdomain} เรียบร้อยแล้ว`);
  } else {
    showToast('แสดงครบทุก Sub-domain');
  }
  renderMindMap();
  if (currentMainView === 'matrix') renderMatrixView();
  if (currentMainView === 'database') renderDatabaseView();
}

// Fill the summary cards from the dataset so the numbers always match the data file.
function renderDatabaseStats() {
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const stat = (dom) => {
    const techs = Object.values(dom.techniques);
    const subs = techs.reduce((a, t) => a + (t.subs || []).length, 0);
    return { techs: techs.length, subs };
  };
  const e = stat(MITRE_FULL_DB.enterprise);
  const m = stat(MITRE_FULL_DB.mobile);
  const i = stat(MITRE_FULL_DB.ics);
  set('statEnt', `${e.techs + e.subs} ข้อ`);
  set('statEntSub', `${e.techs} Techniques + ${e.subs} Sub-techs`);
  set('statMob', `${m.techs + m.subs} ข้อ`);
  set('statMobSub', `${m.techs} Techniques + ${m.subs} Sub-techs`);
  set('statIcs', `${i.techs + i.subs} ข้อ`);
  set('statIcsSub', `${i.techs} Techniques + ${i.subs} Sub-techs`);
}

function renderDatabaseView() {
  const tbody = document.getElementById('databaseTableBody');
  const countBadge = document.getElementById('dbCountBadge');
  if (!tbody) return;

  const domSel = document.getElementById('dbDomainSelect') ? document.getElementById('dbDomainSelect').value : 'all';
  const typeSel = document.getElementById('dbTypeSelect') ? document.getElementById('dbTypeSelect').value : 'all';
  const q = (currentSearchQuery || '').toLowerCase();

  const rows = [];

  if (typeSel === 'all' || typeSel === 'subdomain') {
    MITRE_FULL_DB.subdomains.forEach(sd => {
      if (domSel !== 'all' && sd.domain !== domSel) return;
      if (currentSubdomainFilter !== 'all' && sd.id !== currentSubdomainFilter) return;
      const text = `${sd.id} ${sd.title} ${sd.desc}`.toLowerCase();
      if (q && !text.includes(q)) return;
      rows.push({
        id: sd.id, nodeId: `SUBDOM-${sd.id.replace(/\s+/g, '-')}`, name: sd.title,
        typeBadge: 'Sub-Domain Matrix', typeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        domain: sd.domain.toUpperCase(), platforms: [sd.id], desc: sd.desc, url: sd.url, isSubdomain: true
      });
    });
  }

  const domainSources = [
    { key: 'enterprise', label: 'Enterprise', dict: MITRE_FULL_DB.enterprise.techniques },
    { key: 'mobile', label: 'Mobile', dict: MITRE_FULL_DB.mobile.techniques },
    { key: 'ics', label: 'ICS / OT', dict: MITRE_FULL_DB.ics.techniques }
  ];

  domainSources.forEach(src => {
    if (domSel !== 'all' && domSel !== src.key) return;
    Object.values(src.dict).forEach(t => {
      const plats = t.platforms || [];
      if (currentSubdomainFilter !== 'all' && !plats.includes(currentSubdomainFilter)) return;

      if (typeSel === 'all' || typeSel === 'technique') {
        const text = `${t.id} ${t.name} ${t.desc} ${plats.join(' ')}`.toLowerCase();
        if (!q || text.includes(q)) {
          rows.push({
            id: t.id, nodeId: t.id, name: t.name,
            typeBadge: `Technique (${(t.subs || []).length} sub)`, typeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            domain: src.label, platforms: plats, desc: t.desc, url: `https://attack.mitre.org/techniques/${t.id}/`
          });
        }
      }

      if (typeSel === 'all' || typeSel === 'subtechnique') {
        (t.subs || []).forEach(sub => {
          const text = `${sub.id} ${sub.name} ${sub.desc} ${t.name} ${plats.join(' ')}`.toLowerCase();
          if (!q || text.includes(q)) {
            const parts = sub.id.split('.');
            rows.push({
              id: sub.id, nodeId: sub.id, name: `${sub.name} (${t.name})`,
              typeBadge: 'Sub-technique', typeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
              domain: src.label, platforms: plats, desc: sub.desc,
              url: `https://attack.mitre.org/techniques/${parts[0]}/${parts[1]}/`
            });
          }
        });
      }
    });
  });

  if ((domSel === 'all' || domSel === 'ics') && (typeSel === 'all' || typeSel === 'asset')) {
    MITRE_FULL_DB.ics.assets.forEach(a => {
      const text = `${a.id} ${a.name} ${a.desc}`.toLowerCase();
      if (q && !text.includes(q)) return;
      rows.push({
        id: a.id, nodeId: a.id, name: a.name,
        typeBadge: 'ICS Asset', typeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        domain: 'ICS / OT', platforms: ['ICS Embedded', 'ICS Windows', 'ICS Linux', 'ICS Network Devices'],
        desc: a.desc, url: `https://attack.mitre.org/assets/${a.id}/`
      });
    });
  }

  if (countBadge) {
    countBadge.textContent = `พบ ${rows.length} รายการ`;
  }

  const displayRows = rows.slice(0, 350);
  tbody.innerHTML = displayRows.map(r => `
    <tr class="hover:bg-slate-800/60 transition-colors">
      <td class="py-2 px-3 font-mono font-bold text-amber-300 whitespace-nowrap">${r.id}</td>
      <td class="py-2 px-3 font-semibold text-white">${escapeHtml(r.name)}</td>
      <td class="py-2 px-3 whitespace-nowrap">
        <span class="px-2 py-0.5 rounded text-[10px] font-medium border ${r.typeColor}">${r.typeBadge}</span>
        <span class="ml-1 text-[10px] text-slate-400">${r.domain}</span>
      </td>
      <td class="py-2 px-3">
        <div class="flex flex-wrap gap-1 max-w-xs">
          ${(r.platforms || []).slice(0, 4).map(p => `<span onclick="setSubdomainFilter('${p}')" class="cursor-pointer px-1.5 py-0.5 rounded bg-slate-950 hover:bg-amber-950 text-[10px] text-slate-300 hover:text-amber-300 border border-slate-800">${p}</span>`).join('')}
          ${(r.platforms || []).length > 4 ? `<span class="text-[10px] text-slate-500">+${r.platforms.length - 4}</span>` : ''}
        </div>
      </td>
      <td class="py-2 px-3 text-slate-300 max-w-md truncate" title="${escapeHtml(r.desc)}">${escapeHtml(r.desc)}</td>
      <td class="py-2 px-3 text-right whitespace-nowrap space-x-1">
        ${r.isSubdomain
          ? `<button onclick="setSubdomainFilter('${r.id}'); switchMainView('mindmap');" class="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-medium">🌐 กรอง Mind Map</button>`
          : `<button onclick="selectAndFocusNode('${r.nodeId}'); switchMainView('mindmap');" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium">📍 เปิดบน Mind Map</button>`
        }
        <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="inline-block px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]">MITRE ↗</a>
      </td>
    </tr>
  `).join('') + (rows.length > 350 ? `<tr><td colspan="6" class="py-3 text-center text-slate-400">แสดง 350 รายการแรกจากทั้งหมด ${rows.length} รายการ — ใช้ช่องค้นหาด้านบนเพื่อกรองเฉพาะรหัสหรือชื่อที่ต้องการ</td></tr>` : '');
}

function setAptOverlay(aptKey) {
  currentAptOverlay = aptKey;
  const select = document.getElementById('aptSimulatorSelect');
  if (select && select.value !== aptKey) select.value = aptKey;

  const banner = document.getElementById('aptActiveBanner');
  if (aptKey === 'none') {
    if (banner) banner.classList.add('hidden');
  } else {
    const apt = APT_PROFILES[aptKey];
    if (apt && banner) {
      banner.classList.remove('hidden');
      document.getElementById('aptBannerTitle').textContent = `🎯 เส้นทางโจมตี: ${apt.name}`;
      document.getElementById('aptBannerDesc').textContent = apt.summary;
    }
    expandedNodes.add('ROOT');
    expandedNodes.add('DOM-ENT');
    NODE_MAP.forEach(n => {
      if (n.nodeType === 'tactic' && isNodeHighlightedByApt(n)) {
        expandedNodes.add(n.id);
      }
    });
  }
  renderMindMap();
  if (currentMainView === 'matrix') renderMatrixView();
  if (currentMainView === 'groups') renderAptView();
}

function setRoleLens(role) {
  currentRoleLens = role;
  renderMindMap();
  showToast('เปลี่ยนเลนส์การแสดงผลเรียบร้อยแล้ว');
}

function handleSearchInput(val) {
  let clean = val.trim();
  // Accept a pasted https://attack.mitre.org/... URL and jump to the ID it names
  if (/^https?:\/\/attack\.mitre\.org/i.test(clean)) {
    const idMatch = clean.match(/\b(TA\d{4}|T\d{4}|G\d{4}|S\d{4}|C\d{4}|M\d{4}|DS\d{4})\b/i);
    if (idMatch) {
      clean = idMatch[1].toUpperCase();
      const targetId = NODE_MAP.has(clean) ? clean : (NODE_MAP.has('NODE-' + clean) ? 'NODE-' + clean : clean);
      if (NODE_MAP.has(targetId)) {
        selectAndFocusNode(targetId);
      }
    } else if (/\/matrices\/mobile/i.test(clean)) {
      setDomainFilter('mobile');
      clean = '';
    } else if (/\/matrices\/ics/i.test(clean)) {
      setDomainFilter('ics');
      clean = '';
    } else if (/\/matrices\/enterprise/i.test(clean)) {
      setDomainFilter('enterprise');
      clean = '';
    } else {
      selectAndFocusNode('ROOT');
      clean = '';
    }
  }
  currentSearchQuery = clean;
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) clearBtn.classList.toggle('hidden', val.trim().length === 0);
  renderMindMap();
  if (currentMainView === 'matrix') renderMatrixView();
  if (currentMainView === 'database') renderDatabaseView();
}

function clearSearch() {
  const inp = document.getElementById('globalSearchInput');
  if (inp) inp.value = '';
  handleSearchInput('');
}

// =========================================================================
// 7. EXPORT (MERMAID MINDMAP, MARKDOWN, NAVIGATOR JSON)
// =========================================================================
function generateExportText(format) {
  if (format === 'mermaid') {
    const ent = NODE_MAP.get('DOM-ENT');
    const lines = [
      'mindmap',
      '  root((MITRE ATT&CK v20.0))',
      `    Enterprise Matrix (${ent && ent.children ? ent.children.length : 15} Tactics)`
    ];
    if (ent && ent.children) {
      ent.children.forEach(tac => {
        lines.push(`      ${tac.code} ${tac.title.replace(/[()]/g, '')}`);
        (tac.children || []).forEach(tech => {
          lines.push(`        ${tech.code} ${tech.title.replace(/[()]/g, '')}`);
        });
      });
    }
    lines.push('    Mobile Matrix (Android & iOS)');
    lines.push('      TA0027 Initial Access & Repackaged Apps');
    lines.push('      TA0031 Credential Access & Accessibility Abuse');
    lines.push('    ICS / OT Matrix');
    lines.push('      TA0107 Inhibit Response & Modify PLC Parameter');
    lines.push('    APT Groups & Software');
    lines.push('      G0016 APT29 Cozy Bear & C0024 SolarWinds');
    lines.push('      G0007 APT28 Fancy Bear');
    lines.push('      G0032 Lazarus Group & G0082 APT38');
    lines.push('      G0034 Sandworm Team & S0002 Mimikatz');
    lines.push('    Operational Defense (Blue / Red / Purple)');
    lines.push('      Top Data Sources (Sysmon & SIEM)');
    lines.push('      Enterprise Mitigations (M10xx)');
    return lines.join('\n');
  }

  if (format === 'markdown') {
    const lines = ['# แผนผัง MITRE ATT&CK® v20.0 ครบทุกด้าน (All-in-One Mind Map Outline)', ''];
    MINDMAP_DATA.children.forEach(dom => {
      lines.push(`## ${dom.title} ([${dom.code}](${dom.url}))`);
      lines.push(`- **วัตถุประสงค์**: ${dom.why}`);
      (dom.children || []).forEach(tac => {
        lines.push(`  - ### [${tac.code}] ${tac.title} (${tac.url})`);
        lines.push(`    - **ทำไม (Why)**: ${tac.why}`);
        lines.push(`    - **Blue Team / Detection**: ${tac.blueTeam}`);
        (tac.children || []).forEach(tech => {
          lines.push(`      - **[${tech.code}] ${tech.title}** (${tech.url}) — ${tech.subtitle}`);
        });
      });
      lines.push('');
    });
    return lines.join('\n');
  }

  // ATT&CK Navigator layer: one entry per Enterprise technique / sub-technique ID.
  const techniquesArr = [];
  const seen = new Set();
  NODE_MAP.forEach(n => {
    if (n.domain !== 'enterprise') return;
    if (n.nodeType !== 'technique' && n.nodeType !== 'subtechnique') return;
    if (!/^T\d{4}(\.\d{3})?$/.test(n.code) || seen.has(n.code)) return;
    seen.add(n.code);
    const aptHit = isNodeHighlightedByApt(n);
    const status = nodeUserStatus[n.id] || 'none';
    const entry = {
      techniqueID: n.code,
      score: aptHit ? 100 : (status === 'detecting' ? 75 : 50),
      comment: `${n.title} | Blue Team: ${n.blueTeam || ''}`,
      enabled: true
    };
    const color = aptHit ? '#f43f5e' : (status === 'detecting' ? '#06b6d4' : '');
    if (color) entry.color = color;
    techniquesArr.push(entry);
  });

  const navLayer = {
    name: currentAptOverlay !== 'none' ? `MITRE ATT&CK - ${APT_PROFILES[currentAptOverlay].name}` : "MITRE ATT&CK Custom Mind Map Layer",
    versions: { attack: MITRE_FULL_DB.version.split('.')[0], navigator: "5.2.0", layer: "4.5" },
    domain: "enterprise-attack",
    description: "Generated from MITRE ATT&CK Interactive Mind Map Studio",
    techniques: techniquesArr
  };
  return JSON.stringify(navLayer, null, 2);
}

function openExportModal() {
  document.getElementById('exportModal').classList.remove('hidden');
  switchExportFormat(currentExportFormat);
}

function closeExportModal() {
  document.getElementById('exportModal').classList.add('hidden');
}

function switchExportFormat(fmt) {
  currentExportFormat = fmt;
  ['mermaid', 'markdown', 'navigator'].forEach(k => {
    const btn = document.getElementById('expBtn' + k.charAt(0).toUpperCase() + k.slice(1));
    if (btn) {
      btn.className = k === fmt
        ? 'px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white'
        : 'px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white';
    }
  });
  document.getElementById('exportTextarea').value = generateExportText(fmt);
}

function copyText(text, okMessage, fallbackEl) {
  const fallback = () => {
    if (fallbackEl) {
      fallbackEl.focus();
      fallbackEl.select();
    }
    try {
      if (document.execCommand('copy')) {
        showToast(okMessage);
        return;
      }
    } catch (e) {}
    showToast('คัดลอกอัตโนมัติไม่ได้ — กด Ctrl+C / ⌘C เพื่อคัดลอกข้อความที่เลือกไว้');
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(okMessage)).catch(fallback);
  } else {
    fallback();
  }
}

function copyExportCode() {
  const area = document.getElementById('exportTextarea');
  if (!area) return;
  copyText(area.value, 'คัดลอกโค้ดไปยังคลิปบอร์ดแล้ว', area);
}

function downloadExportFile() {
  const content = document.getElementById('exportTextarea').value;
  const ext = currentExportFormat === 'navigator' ? 'json' : (currentExportFormat === 'mermaid' ? 'mmd' : 'md');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mitre_attack_mindmap.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`ดาวน์โหลดไฟล์ mitre_attack_mindmap.${ext} แล้ว (ถ้าไม่เริ่มดาวน์โหลด ให้ใช้ปุ่มคัดลอกแทน)`);
}

function copyOfficialUrl(url) {
  copyText(url, 'คัดลอกลิงก์ ' + url + ' แล้ว', null);
}

function showToast(msg) {
  const toast = document.getElementById('toastNotice');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2400);
}

// =========================================================================
// 8. POINTER / TOUCH PAN & WHEEL ZOOM INITIALIZATION
// =========================================================================
function initApp() {
  const vp = document.getElementById('mindmapViewport');
  if (vp) {
    vp.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.mm-node') || e.target.closest('.net-orb-wrapper') || e.target.closest('button')) return;
      isDragging = true;
      dragStartX = e.clientX - vpPanX;
      dragStartY = e.clientY - vpPanY;
      vp.setPointerCapture(e.pointerId);
    });

    vp.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      vpPanX = e.clientX - dragStartX;
      vpPanY = e.clientY - dragStartY;
      applyViewportTransform();
    });

    const endDrag = () => { isDragging = false; };
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', endDrag);

    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      zoomMindmap(factor);
    }, { passive: false });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeExportModal();
  });

  renderDatabaseStats();
  resetMindmapViewport();
  renderMindMap();
  selectedNodeId = 'T1598.001';
  renderInspector(NODE_MAP.get('T1598.001') || NODE_MAP.get(customCenterRootId) || MINDMAP_DATA);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
