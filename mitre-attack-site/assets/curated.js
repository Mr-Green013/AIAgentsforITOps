// Hand-curated content: APT overlays, role playbooks, the base mind map tree and the sub-technique deep-dive KB.
// app.js merges MITRE_FULL_DB (mitre-db.js) into MINDMAP_DATA at load time, keeping the rich Thai text here.

const APT_PROFILES = {
  G0016: {
    id: "G0016",
    name: "APT29 (Cozy Bear / SolarWinds C0024)",
    origin: "Russia (SVR)",
    url: "https://attack.mitre.org/groups/G0016/",
    target: "หน่วยงานรัฐ, การทูต, คลังสมอง (Think Tanks), Cloud & Microsoft 365",
    summary: "เน้นการเจาะระบบแบบเงียบเชียบ (Stealth), โจมตี Supply Chain (เช่น แคมเปญ C0024 SolarWinds Compromise), ขโมย OAuth/SAML Token และฝังตัวในระบบ Cloud",
    techniques: ["T1595", "T1588", "T1566", "T1195", "T1059", "T1078", "T1098", "T1027", "T1003", "T1552", "T1087", "T1021", "T1560", "T1071", "T1041"]
  },
  G0007: {
    id: "G0007",
    name: "APT28 (Fancy Bear / GRU)",
    origin: "Russia (GRU Unit 26165)",
    url: "https://attack.mitre.org/groups/G0007/",
    target: "กองทัพ, รัฐบาล, สื่อมวลชน, โครงสร้างพื้นฐานด้านพลังงานและการบิน",
    summary: "เชี่ยวชาญ Spearphishing, การโจมตีช่องโหว่ Zero-day บน Edge Router/Webmail, Credential Harvesting และการทำ Lateral Movement ใน Active Directory",
    techniques: ["T1598", "T1566", "T1190", "T1059", "T1053", "T1547", "T1070", "T1003", "T1110", "T1082", "T1021", "T1114", "T1071"]
  },
  G0032: {
    id: "G0032",
    name: "Lazarus Group (G0032) & APT38 (G0082)",
    origin: "North Korea",
    url: "https://attack.mitre.org/groups/G0032/",
    target: "สถาบันการเงิน, ธนาคาร (SWIFT), ตลาดแลกเปลี่ยน Cryptocurrency, บริษัทซอฟต์แวร์",
    summary: "โจมตีทั้งเพื่อผลประโยชน์ทางการเงิน (APT38) และการจารกรรม/ทำลายข้อมูล (Lazarus) มักใช้ Trojanized Software, Social Engineering หลอกนักพัฒนา และทำ Data Destruction",
    techniques: ["T1589", "T1587", "T1566", "T1204", "T1059", "T1055", "T1027", "T1003", "T1082", "T1021", "T1071", "T1485", "T1486"]
  },
  G0034: {
    id: "G0034",
    name: "Sandworm Team (G0034 - ICS/OT & Wipers)",
    origin: "Russia (GRU Unit 74455)",
    url: "https://attack.mitre.org/groups/G0034/",
    target: "ระบบโครงข่ายไฟฟ้า (Power Grid), โครงสร้างพื้นฐานระดับชาติ, ระบบควบคุมอุตสาหกรรม (ICS/OT)",
    summary: "กลุ่มผู้โจมตีที่อยู่เบื้องหลังการตัดไฟในยูเครนและมัลแวร์ทำลายข้อมูล (NotPetya / Industroyer) เชื่อมโยงการเจาะ IT เข้าสู่ระบบควบคุม OT/SCADA",
    techniques: ["T1190", "T1133", "T1078", "T1059", "T1053", "T1070", "T1003", "T1046", "T1021", "T1485", "T1486", "T0836"]
  },
  LOCKBIT: {
    id: "S0002",
    name: "Modern Ransomware & Mimikatz (S0002) Chain",
    origin: "Ransomware-as-a-Service (RaaS)",
    url: "https://attack.mitre.org/software/S0002/",
    target: "องค์กรทุกขนาด โรงพยาบาล โรงงานอุตสาหกรรม และระบบ Cloud/VMware ESXi",
    summary: "ห่วงโซ่การโจมตีของแรนซัมแวร์ยุคใหม่ (Double Extortion): เจาะผ่าน VPN/RDP -> ปิด EDR (T1562) -> ดึงรหัสผ่านด้วย Mimikatz (S0002 / T1003) -> ขโมยข้อมูลออก (T1567) -> ลบ Shadow Copies (T1490) และเข้ารหัสไฟล์ (T1486)",
    techniques: ["T1190", "T1133", "T1078", "T1059", "T1562", "T1070", "T1003", "T1082", "T1021", "T1560", "T1567", "T1490", "T1486"]
  }
};

const PLAYBOOK_DATA = [
  {
    id: "PB-BLUE",
    role: "SOC / Blue Team & Detection Engineering",
    badge: "Defensive Operations",
    color: "cyan",
    url: "https://attack.mitre.org/datasources/",
    summary: "ใช้ MITRE ATT&CK เพื่อออกแบบกฎตรวจจับ (SIEM/EDR Detection Rules), ประเมินช่องโหว่ของการเก็บ Log (Data Source Coverage) และทำ Threat Hunting",
    steps: [
      "1. จัดทำ Log & Data Source Mapping: ตรวจสอบว่าระบบเก็บ Process Creation (Sysmon ID 1 / Windows 4688), PowerShell Script Block (4104), และ Authentication Logs ครบถ้วนหรือไม่",
      "2. สร้าง Detection Coverage Heatmap: ใช้ ATT&CK Navigator ให้คะแนนความครอบคลุมของ SIEM/EDR ในแต่ละ Technique",
      "3. เน้นจับที่แกนคอขวด (Choke Points): เช่น Credential Dumping (T1003), Command & Scripting Interpreter (T1059), และ Valid Accounts (T1078)",
      "4. ผูก Playbook การตอบสนอง (SOAR / Incident Response) เข้ากับรหัส Tactic & Technique ใน Ticket ทุกใบ"
    ]
  },
  {
    id: "PB-RED",
    role: "Red Team & Adversary Emulation",
    badge: "Offensive Security",
    color: "rose",
    url: "https://attack.mitre.org/matrices/enterprise/",
    summary: "จำลองพฤติกรรมการโจมตีของกลุ่มแฮกเกอร์จริง (Adversary Emulation) เพื่อวัดผลว่าทีมป้องกันตรวจจับและรับมือได้ทันหรือไม่",
    steps: [
      "1. เลือกกลุ่มภัยคุกคามเป้าหมาย (เช่น APT29 G0016 หรือ APT28 G0007) ที่ตรงกับอุตสาหกรรมขององค์กร",
      "2. วางลำดับ Kill Chain ตั้งแต่ Initial Access -> Execution -> Privilege Escalation -> Lateral Movement -> Exfiltration",
      "3. ใช้เครื่องมือจำลองอัตโนมัติ เช่น Atomic Red Team, MITRE Caldera หรือรันคำสั่ง Manual ตาม Sub-techniques",
      "4. สรุปรายงานโดยระบุรหัส T1xxx ของทุกขั้นตอน พร้อมเวลาที่รัน เพื่อเทียบกับเวลาที่ SOC ตรวจพบ (MTTD/MTTR)"
    ]
  },
  {
    id: "PB-CTI",
    role: "Cyber Threat Intelligence (CTI)",
    badge: "Intelligence & Attribution",
    color: "amber",
    url: "https://attack.mitre.org/groups/",
    summary: "แปลงรายงานข่าวกรองภัยคุกคาม (Threat Reports) จากข้อความยาวๆ ให้กลายเป็นรหัสมาตรฐาน TTPs (Pyramid of Pain ขั้นสูงสุด)",
    steps: [
      "1. สกัดพฤติกรรม (Behaviors) จากรายงานแคมเปญการโจมตี (เช่น C0024) และแมปเข้ากับรหัส Tactic (TAxxxx) และ Technique (Txxxx.xxx)",
      "2. วิเคราะห์ความทับซ้อนของเทคนิคระหว่างกลุ่มผู้โจมตีที่มุ่งเป้ากลุ่มธุรกิจเดียวกันในประเทศไทยและภูมิภาค",
      "3. ส่งออกเป็นไฟล์ ATT&CK Navigator JSON Layer เพื่อให้ทีม SOC นำไปทำ Priority Hunting ทันที",
      "4. ยกระดับจากแค่การบล็อก IP/Hash (Indicators) ไปสู่การดักจับพฤติกรรม TTPs ที่ผู้โจมตีเปลี่ยนได้ยาก"
    ]
  },
  {
    id: "PB-PURPLE",
    role: "Purple Team & CISO Governance",
    badge: "Continuous Improvement",
    color: "emerald",
    url: "https://attack.mitre.org/mitigations/enterprise/",
    summary: "ผสานความร่วมมือระหว่าง Red Team และ Blue Team เพื่อวัดผล ROI ด้านความปลอดภัยและปิดช่องโหว่เชิงโครงสร้าง (Mitigations M10xx)",
    steps: [
      "1. ทำตารางซ้อมรบร่วม (Purple Team Exercise): Red Team ยิง 1 Technique -> Blue Team ตรวจสอบทันทีว่า Log ขึ้นหรือไม่และ Alert ทำงานหรือไม่",
      "2. จัดลำดับความสำคัญของการลงทุน Security Controls โดยอิงจาก MITRE Mitigations (เช่น M1032 Multi-factor Authentication, M1026 Privileged Account Management)",
      "3. รายงานผู้บริหารด้วยคะแนนความพร้อม (Readiness Score) แยกตาม 15 Tactics แทนการดูแค่จำนวนช่องโหว่ CVE",
      "4. ทบทวนซ้ำทุกไตรมาสเมื่อมีเทคนิคใหม่ใน MITRE ATT&CK เวอร์ชันล่าสุด (v20.0)"
    ]
  }
];

// Base hierarchical mind map. Enterprise/Mobile/ICS tactic children are rebuilt from MITRE_FULL_DB in app.js;
// the rich text of techniques written here is preserved by technique ID during that merge.
const MINDMAP_DATA = {
  id: "ROOT",
  code: "ATT&CK® v20",
  title: "MITRE ATT&CK® Framework",
  subtitle: "ฐานความรู้มาตรฐานระดับโลกด้านพฤติกรรมผู้โจมตี (Tactics, Techniques & Procedures)",
  domain: "all",
  nodeType: "root",
  url: "https://attack.mitre.org/",
  why: "รวบรวมและจัดหมวดหมู่พฤติกรรมของผู้โจมตีจากการสังเกตการณ์จริงทั่วโลก เพื่อเป็นภาษากลางให้ทีม Red Team, Blue Team/SOC และ Threat Intelligence",
  how: "แบ่งออกเป็น 3 Matrices หลัก (Enterprise, Mobile, ICS) โดยมีโครงสร้างหลักคือ Tactics (เป้าหมายของผู้โจมตี - Why), Techniques/Sub-techniques (วิธีการลงมือ - How), Procedures (ตัวอย่างการใช้งานจริง), Mitigations และ Data Sources",
  redTeam: "ใช้เป็นแม่แบบจำลองการโจมตี (Adversary Emulation) และวางแผนเจาะระบบให้ครอบคลุมทุกขั้นตอนของ Kill Chain",
  blueTeam: "ใช้ประเมินความครอบคลุมของการตรวจจับ (Detection Coverage), ผูกกฎ SIEM/EDR และวางมาตรการป้องกัน (Mitigations)",
  dataSources: ["Process Creation", "Command Execution", "Network Traffic", "Authentication Logs", "File & Registry Monitoring", "Cloud Audit Logs"],
  mitigations: ["M1032 Multi-factor Authentication", "M1026 Privileged Account Management", "M1047 Audit", "M1030 Network Segmentation"],
  children: [
    // BRANCH 1: ENTERPRISE MATRIX
    {
      id: "DOM-ENT",
      code: "ENTERPRISE",
      title: "1. Enterprise Matrix (15 Tactics • v20.0)",
      subtitle: "Windows • macOS • Linux • Cloud (AWS/Azure/GCP/SaaS) • Containers • Network",
      domain: "enterprise",
      nodeType: "domain",
      url: "https://attack.mitre.org/matrices/enterprise/",
      why: "ครอบคลุมโครงสร้างพื้นฐานระดับองค์กรทั้งหมด ตั้งแต่การหาข้อมูลก่อนโจมตี (PRE-ATT&CK) ไปจนถึงการยึดระบบและสร้างความเสียหาย (14 ขั้นตอนหลัก)",
      how: "เรียงลำดับตามวงจรการโจมตี (Kill Chain) ทั้งหมด 15 Tactics ตั้งแต่ TA0043 Reconnaissance จนถึง TA0040 Impact",
      redTeam: "ใช้วางแผน Red Team Engagement ทั้งบน On-Premise Active Directory และระบบ Cloud/Hybrid",
      blueTeam: "เป็นกรอบหลักของ SOC ในการตั้งค่า SIEM Use Cases, EDR Telemetry และการทำ Threat Hunting",
      dataSources: ["Windows Event Logs / Sysmon", "EDR Telemetry", "Linux Auditd", "CloudTrail / Entra ID Logs", "Firewall / NDR"],
      mitigations: ["Zero Trust Architecture", "Endpoint Detection & Response (EDR)", "Identity Protection"],
      children: [
        {
          id: "TA0043", code: "TA0043", title: "01. Reconnaissance (12 Techniques)",
          subtitle: "การสำรวจข้อมูลเป้าหมาย (รวม Query Public AI Services ใน v20)",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0043/",
          why: "ผู้โจมตีต้องการเก็บข้อมูลโครงสร้างเครือข่าย อีเมลพนักงาน และเทคโนโลยีขององค์กรเพื่อวางแผนโจมตี",
          how: "ใช้ทั้งการสแกนโดยตรง (Active Scanning) การหาข้อมูลจากแหล่งเปิด (OSINT) และการหลอกถามข้อมูล (Phishing for Information)",
          redTeam: "ใช้เครื่องมืออย่าง Shodan, Censys, Amass, Nmap, LinkedIn OSINT เพื่อหาช่องทางเข้าที่อ่อนแอที่สุด",
          blueTeam: "ตรวจจับ Port/Vulnerability Scan ที่ผิดปกติที่ Firewall/WAF, ทำ Digital Footprint Monitoring และลดข้อมูลสำคัญที่เปิดเผยต่อสาธารณะ",
          dataSources: ["Network Traffic Content", "Network Traffic Flow", "DNS Records", "Web Server Access Logs"],
          mitigations: ["M1056 Pre-compromise Protection", "จำกัดการเปิดเผยข้อมูลโครงสร้างภายในสู่สาธารณะ"],
          children: [
            {
              id: "T1595", code: "T1595", title: "Active Scanning",
              subtitle: "สแกน IP, Port และช่องโหว่ของเป้าหมายโดยตรง",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1595/",
              why: "ค้นหาบริการที่เปิดอยู่บนอินเทอร์เน็ตและตรวจสอบเวอร์ชันที่มีช่องโหว่",
              how: "Sub-techniques: T1595.001 Scanning IP Blocks, T1595.002 Vulnerability Scanning, T1595.003 Wordlist Scanning",
              redTeam: "รัน Nmap, Masscan, Nuclei หรือ ffuf เพื่อสำรวจ External Attack Surface",
              blueTeam: "ตั้งค่า IDS/IPS/WAF ตรวจจับอัตราการส่ง Request หรือ SYN Scan ที่พุ่งสูงผิดปกติจาก IP ภายนอก",
              dataSources: ["Network Traffic: Network Traffic Flow", "Network Traffic: Network Traffic Content"],
              mitigations: ["M1056 Pre-compromise", "Rate Limiting & Threat Intelligence IP Blocking"],
              subtechniques: ["T1595.001 Scanning IP Blocks", "T1595.002 Vulnerability Scanning", "T1595.003 Wordlist Scanning"]
            },
            {
              id: "T1589", code: "T1589", title: "Gather Victim Identity Info",
              subtitle: "รวบรวมรายชื่อพนักงาน อีเมล และรหัสผ่านที่รั่วไหล",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1589/",
              why: "นำรายชื่ออีเมลและรหัสผ่านเก่าไปใช้ทำ Credential Stuffing หรือ Spearphishing",
              how: "Sub-techniques: T1589.001 Credentials, T1589.002 Email Addresses, T1589.003 Employee Names",
              redTeam: "ค้นหาจากฐานข้อมูล Breach Dump, GitHub Commits และโซเชียลมีเดียของพนักงาน",
              blueTeam: "ตรวจสอบบัญชีองค์กรที่รั่วไหลบน Dark Web และบังคับเปลี่ยนรหัสผ่านพร้อมเปิด MFA",
              dataSources: ["Threat Intelligence Feeds", "Dark Web Credential Monitoring"],
              mitigations: ["M1056 Pre-compromise", "M1032 Multi-factor Authentication"],
              subtechniques: ["T1589.001 Credentials", "T1589.002 Email Addresses", "T1589.003 Employee Names"]
            },
            {
              id: "T1598", code: "T1598", title: "Phishing for Information",
              subtitle: "ส่งข้อความหลอกล่อเพื่อดึงข้อมูลความลับหรือรหัสผ่าน",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1598/",
              why: "หลอกให้เหยื่อกรอกข้อมูลบัญชีหรือเปิดเผยข้อมูลภายในโดยยังไม่ต้องส่งมัลแวร์",
              how: "Sub-techniques: T1598.001 Spearphishing Service, T1598.002 Spearphishing Attachment, T1598.003 Spearphishing Link",
              redTeam: "สร้างหน้า Login ปลอม (Evilginx2) หรือส่งอีเมลสอบถามข้อมูลเชิงเทคนิค",
              blueTeam: "ใช้ Email Security Gateway, ตรวจสอบโดเมนเลียนแบบ (Typosquatting) และฝึกอบรม Security Awareness",
              dataSources: ["Application Log: Email Gateway Logs", "Network Traffic: DNS Query Logs"],
              mitigations: ["M1054 Software Configuration", "M1017 User Training"],
              subtechniques: ["T1598.001 Spearphishing Service", "T1598.002 Spearphishing Attachment", "T1598.003 Spearphishing Link", "T1598.004 Spearphishing Voice", "T1598.005 Query Public AI Services (v20)"]
            }
          ]
        },
        {
          id: "TA0042", code: "TA0042", title: "02. Resource Development (9 Techniques)",
          subtitle: "การเตรียมโครงสร้างพื้นฐาน มัลแวร์ และ AI Capabilities",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0042/",
          why: "ผู้โจมตีต้องเตรียมเซิร์ฟเวอร์ C2, จดโดเมน, สร้างมัลแวร์ หรือซื้อใบรับรองดิจิทัลเพื่อใช้ในการปฏิบัติการ",
          how: "เช่า VPS/Cloud, ยึดเซิร์ฟเวอร์ที่ปลอดภัยต่ำมาเป็น Botnet/Proxy, พัฒนาหรือซื้อ Malware/Exploit",
          redTeam: "ตั้งค่า Redirector, จดโดเมนที่มีหมวดหมู่ความน่าเชื่อถือสูง และเตรียม Payload ที่หลบ EDR",
          blueTeam: "ติดตามข้อมูล Threat Intelligence เกี่ยวกับโดเมนที่เพิ่งจดใหม่ (Newly Registered Domains) และใบรับรอง TLS ที่น่าสงสัย",
          dataSources: ["Domain Registration / WHOIS", "Internet Scan Data", "SSL/TLS Certificates"],
          mitigations: ["M1056 Pre-compromise", "บล็อกการเชื่อมต่อกับ Newly Registered Domains (NRD)"],
          children: [
            {
              id: "T1583", code: "T1583", title: "Acquire Infrastructure",
              subtitle: "จัดหาโดเมน เซิร์ฟเวอร์ VPS หรือบริการ Cloud สำหรับทำ C2",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1583/",
              why: "ใช้เป็นฐานบัญชาการ (Command & Control) และจุดวางไฟล์หลอกล่อ",
              how: "Sub-techniques: T1583.001 Domains, T1583.003 Virtual Private Server, T1583.006 Web Services",
              redTeam: "ใช้ Cloud CDN หรือบริการ SaaS ยอดนิยมเป็น C2 Redirector เพื่อกลืนไปกับทราฟฟิกปกติ",
              blueTeam: "ใช้ Threat Intelligence Feed ตรวจจับ IP/Domain ที่เกี่ยวข้องกับ C2 Framework เช่น Cobalt Strike หรือ Sliver",
              dataSources: ["Domain Name: Passive DNS", "Internet Scan: Response Content"],
              mitigations: ["M1056 Pre-compromise"],
              subtechniques: ["T1583.001 Domains", "T1583.003 Virtual Private Server", "T1583.006 Web Services"]
            },
            {
              id: "T1587", code: "T1587", title: "Develop Capabilities",
              subtitle: "พัฒนามัลแวร์, ใบรับรองดิจิทัล หรือ Exploit เฉพาะทาง",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1587/",
              why: "สร้างเครื่องมือที่ไม่ตรงกับ Signature ของ Antivirus/EDR ทั่วไป",
              how: "Sub-techniques: T1587.001 Malware, T1587.002 Code Signing Certificates, T1587.004 Exploits",
              redTeam: "เขียน Custom Loader/Dropper และเข้ารหัส Payload",
              blueTeam: "ใช้การตรวจจับเชิงพฤติกรรม (Behavioral Analytics) แทนการพึ่งพา Hash เพียงอย่างเดียว",
              dataSources: ["Malware Repository", "Certificate Transparency Logs"],
              mitigations: ["M1056 Pre-compromise"],
              subtechniques: ["T1587.001 Malware", "T1587.002 Code Signing Certificates", "T1587.004 Exploits"]
            },
            {
              id: "T1588", code: "T1588", title: "Obtain Capabilities",
              subtitle: "จัดหาเครื่องมือสำเร็จรูป ช่องโหว่ หรือใบรับรองจากภายนอก",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1588/",
              why: "ลดเวลาพัฒนาและลดโอกาสถูกระบุตัวตน (Attribution) โดยใช้เครื่องมือ Open-source หรือซื้อมัลแวร์",
              how: "Sub-techniques: T1588.001 Malware, T1588.002 Tool (Mimikatz, Impacket, Cobalt Strike), T1588.006 Vulnerabilities",
              redTeam: "นำเครื่องมืออย่าง Impacket, BloodHound, Rubeus มาปรับแต่งใช้ในการจำลองโจมตี",
              blueTeam: "เขียน YARA Rules และ Sigma Rules ดักจับพารามิเตอร์และพฤติกรรมของเครื่องมือยอดนิยม",
              dataSources: ["Malware Repository", "Endpoint Process & Memory Telemetry"],
              mitigations: ["M1056 Pre-compromise"],
              subtechniques: ["T1588.001 Malware", "T1588.002 Tool", "T1588.006 Vulnerabilities", "T1588.007 Artificial Intelligence", "Stage Capabilities: AI Result Poisoning"]
            }
          ]
        },
        {
          id: "TA0001", code: "TA0001", title: "03. Initial Access (11 Techniques)",
          subtitle: "การเจาะเข้าสู่เครือข่ายเป้าหมายเป็นก้าวแรก (Phishing, Exploit, Supply Chain, Wi-Fi)",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0001/",
          why: "ผู้โจมตีต้องการสร้างจุดยืนแรก (Foothold) ภายในเครือข่ายหรือระบบ Cloud ขององค์กร",
          how: "ส่งอีเมล Phishing, โจมตีช่องโหว่ของเว็บ/เซิร์ฟเวอร์ที่เปิดออกสู่อินเทอร์เน็ต, ใช้รหัสผ่าน VPN/RDP ที่รั่วไหล หรือโจมตีผ่าน Supply Chain",
          redTeam: "ทดสอบส่ง Phishing จำลอง, ตรวจสอบช่องโหว่บน External Web/VPN หรือทดสอบ Password Spraying",
          blueTeam: "เปิดใช้ Phishing-resistant MFA, อัปเดตแพตช์ระบบ External-facing ทันที และจำกัดการเข้าถึง RDP/VPN",
          dataSources: ["Email Gateway Logs", "Web Application Firewall (WAF)", "Authentication Logs", "Process Creation"],
          mitigations: ["M1032 Multi-factor Authentication", "M1050 Exploit Protection", "M1017 User Training"],
          children: [
            {
              id: "T1566", code: "T1566", title: "Phishing",
              subtitle: "ส่งอีเมลหรือข้อความพร้อมไฟล์แนบ/ลิงก์อันตรายเพื่อเจาะระบบ",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1566/",
              why: "เป็นช่องทางหลักอันดับต้นๆ ในการเข้าถึงเครื่องผู้ใช้งานภายในองค์กร",
              how: "Sub-techniques: T1566.001 Spearphishing Attachment (ISO/LNK/Macro), T1566.002 Spearphishing Link, T1566.003 Spearphishing via Service",
              redTeam: "ส่งไฟล์แนบ .ISO/.LNK หรือลิงก์ HTML Smuggling เพื่อรัน Payload บนเครื่องเป้าหมาย",
              blueTeam: "บล็อกไฟล์แนบเสี่ยงสูง (.iso, .lnk, .hta, .vbs), ใช้ Sandbox ตรวจไฟล์แนบ และตรวจจับเมื่อ Outlook/Browser เรียกใช้ cmd/powershell",
              dataSources: ["Application Log: Email Logs", "File: File Creation", "Process: Process Creation"],
              mitigations: ["M1049 Antivirus/Antimalware", "M1031 Network Intrusion Prevention", "M1017 User Training"],
              subtechniques: ["T1566.001 Spearphishing Attachment", "T1566.002 Spearphishing Link", "T1566.003 Spearphishing via Service"]
            },
            {
              id: "T1190", code: "T1190", title: "Exploit Public-Facing Application",
              subtitle: "โจมตีช่องโหว่ของเว็บ แอปพลิเคชัน หรืออุปกรณ์ขอบข่าย (VPN/Firewall)",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1190/",
              why: "เจาะเข้าเซิร์ฟเวอร์หรืออุปกรณ์เครือข่ายได้โดยตรงโดยไม่ต้องพึ่งพาการคลิกของผู้ใช้",
              how: "ใช้ช่องโหว่ SQL Injection, RCE, Deserialization หรือ CVE บน VPN/Firewall/Web Server",
              redTeam: "ตรวจสอบ CVE ล่าสุดบนระบบ External และทดสอบ Web App Penetration Testing",
              blueTeam: "ทำ Vulnerability Management เร่งด่วนสำหรับ External Assets, ใช้ WAF และตรวจจับเมื่อโปรเซสของ Web Server (w3wp.exe, nginx, tomcat) รันคำสั่ง Shell",
              dataSources: ["Application Log", "Network Traffic Content", "Process Creation"],
              mitigations: ["M1048 Application Isolation and Sandboxing", "M1050 Exploit Protection", "M1051 Update Software"],
              subtechniques: ["Web Server RCE", "Edge VPN/Appliance Zero-Day Exploitation", "SQLi / SSRF to Cloud Metadata"]
            },
            {
              id: "T1078", code: "T1078", title: "Valid Accounts",
              subtitle: "ใช้บัญชีผู้ใช้จริงที่ขโมยมาในการล็อกอินเข้าสู่ระบบ",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1078/",
              why: "หลีกเลี่ยงการถูกตรวจจับเพราะดูเหมือนพนักงานล็อกอินตามปกติ (ใช้ได้ทั้ง Initial Access, Persistence, Privilege Escalation, Defense Evasion)",
              how: "Sub-techniques: T1078.001 Default Accounts, T1078.002 Domain Accounts, T1078.003 Local Accounts, T1078.004 Cloud Accounts",
              redTeam: "ใช้รหัสผ่านที่ยึดได้ล็อกอินผ่าน VPN, Microsoft 365 หรือ AWS Console",
              blueTeam: "ใช้ UEBA / Impossible Travel Detection, บังคับ MFA ทุกบัญชี และตรวจสอบการล็อกอินนอกเวลาทำการ",
              dataSources: ["Logon Session: Logon Session Creation", "User Account: User Account Authentication"],
              mitigations: ["M1032 Multi-factor Authentication", "M1027 Password Policies", "M1026 Privileged Account Management"],
              subtechniques: ["T1078.001 Default Accounts", "T1078.002 Domain Accounts", "T1078.003 Local Accounts", "T1078.004 Cloud Accounts"]
            },
            {
              id: "T1195", code: "T1195", title: "Supply Chain Compromise",
              subtitle: "แทรกซึมผ่านซอฟต์แวร์ ไลบรารี หรือผู้ให้บริการภายนอก (เช่น แคมเปญ C0024)",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/campaigns/C0024/",
              why: "อาศัยความเชื่อถือที่องค์กรมีต่ออัปเดตซอฟต์แวร์หรือระบบของผู้ให้บริการในการเจาะเข้าหลายองค์กรพร้อมกัน",
              how: "Sub-techniques: T1195.001 Compromise Software Dependencies, T1195.002 Compromise Software Supply Chain",
              redTeam: "ตรวจสอบ Dependency Confusion และสิทธิ์การเชื่อมต่อของ Vendor ภายนอก",
              blueTeam: "ตรวจสอบความถูกต้องของซอฟต์แวร์ (SBOM / Code Signing), แยกเครือข่ายสำหรับซอฟต์แวร์บริหารจัดการ และเฝ้าระวังพฤติกรรมผิดปกติหลังอัปเดต",
              dataSources: ["File Creation", "Network Traffic", "Process Creation"],
              mitigations: ["M1051 Update Software", "M1045 Code Signing", "Vendor Access Zero-Trust Controls"],
              subtechniques: ["T1195.001 Software Dependencies", "T1195.002 Software Supply Chain", "T1195.003 Hardware Supply Chain"]
            },
            {
              id: "T1133", code: "T1133", title: "External Remote Services",
              subtitle: "เจาะผ่านบริการรีโมตจากภายนอก เช่น VPN, RDP, Citrix หรือ SSH",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1133/",
              why: "เข้าถึงเครือข่ายภายในโดยตรงผ่านช่องทางรีโมตที่เปิดทิ้งไว้",
              how: "โจมตีผ่านบริการ RDP (Port 3389), VPN Gateway หรือ SSH ที่ไม่มี MFA",
              redTeam: "ค้นหาบริการ Remote Access ที่เปิดสู่ภายนอกและทดสอบล็อกอินด้วยบัญชีที่รั่วไหล",
              blueTeam: "ห้ามเปิด RDP ออกสู่อินเทอร์เน็ตโดยตรง, บังคับใช้ VPN/ZTNA พร้อม MFA และจำกัด IP ต้นทาง",
              dataSources: ["Logon Session Creation", "Network Traffic Flow"],
              mitigations: ["M1032 Multi-factor Authentication", "M1035 Limit Access to Resource Over Network", "M1042 Disable or Remove Feature"],
              subtechniques: ["Exposed RDP / SSH", "VPN Gateway Abuse", "Citrix / VDI Remote Access"]
            }
          ]
        },
        {
          id: "TA0002", code: "TA0002", title: "04. Execution (22 Techniques)",
          subtitle: "การรันโค้ด คำสั่งสคริปต์ Prompt Injection และ ESXi/Cloud Command",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0002/",
          why: "เปลี่ยนจากการเข้าถึงระบบให้กลายเป็นการสั่งงานโปรแกรมหรือสคริปต์ตามที่ผู้โจมตีต้องการ",
          how: "ใช้ Command-line / PowerShell / Bash, หลอกให้ผู้ใช้คลิกเปิดไฟล์ หรือสั่งรันผ่าน WMI / Scheduled Task",
          redTeam: "ใช้ PowerShell in-memory execution, Windows Command Shell หรือ WMI เพื่อรัน Payload โดยทิ้งร่องรอยน้อยที่สุด",
          blueTeam: "เปิด PowerShell Script Block Logging (Event ID 4104), ตรวจจับ Process Creation (Sysmon ID 1 / Event 4688) และใช้ Application Control",
          dataSources: ["Process: Process Creation", "Command: Command Execution", "Script: Script Execution"],
          mitigations: ["M1038 Execution Prevention", "M1042 Disable or Remove Feature or Program", "M1021 Restrict Web-Based Content"],
          children: [
            {
              id: "T1059", code: "T1059", title: "Command and Scripting Interpreter",
              subtitle: "รันคำสั่งผ่าน PowerShell, CMD, Bash, Python หรือ VBScript/JScript",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1059/",
              why: "เป็นเทคนิคที่พบบ่อยที่สุดในโลกไซเบอร์ เพราะใช้เครื่องมือที่ติดตั้งมาพร้อมกับ OS อยู่แล้ว",
              how: "Sub-techniques: T1059.001 PowerShell, T1059.003 Windows Command Shell, T1059.004 Unix Shell, T1059.005 Visual Basic, T1059.006 Python, T1059.007 JavaScript",
              redTeam: "รัน `powershell.exe -nop -w hidden -enc <Base64>` หรือรันสคริปต์ดาวน์โหลด Payload ในหน่วยความจำ",
              blueTeam: "เปิด Event ID 4104 (PowerShell Script Block), ตรวจสอบพารามิเตอร์ `-enc`, `-w hidden`, `IEX`, `DownloadString` และใช้ AMSI",
              dataSources: ["Command: Command Execution", "Process: Process Creation", "Script: Script Execution"],
              mitigations: ["M1049 Antivirus/Antimalware (AMSI)", "M1045 Code Signing", "M1038 Execution Prevention (AppLocker/WDAC)"],
              subtechniques: ["T1059.001 PowerShell", "T1059.003 Windows Command Shell", "T1059.004 Unix Shell", "T1059.006 Python", "T1059.007 JavaScript"]
            },
            {
              id: "T1204", code: "T1204", title: "User Execution",
              subtitle: "หลอกให้ผู้ใช้งานคลิกลิงก์ เปิดไฟล์ หรือรันอิมเมจอันตรายด้วยตนเอง",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1204/",
              why: "อาศัยสิทธิ์ของผู้ใช้ในการเริ่มต้นรันโค้ดเมื่อเจาะผ่าน Phishing",
              how: "Sub-techniques: T1204.001 Malicious Link, T1204.002 Malicious File, T1204.003 Malicious Image (Container/VM)",
              redTeam: "สร้างไฟล์ LNK หรือ OneNote/PDF ที่หลอกให้ผู้ใช้กดปุ่มเปิดใช้งานเนื้อหา",
              blueTeam: "บล็อกการรัน Macro จากอินเทอร์เน็ต (Mark-of-the-Web) และตรวจสอบ Parent-Child Process ที่ผิดปกติ เช่น `winword.exe -> cmd.exe`",
              dataSources: ["Process: Process Creation", "File: File Creation"],
              mitigations: ["M1038 Execution Prevention", "M1021 Restrict Web-Based Content", "M1017 User Training"],
              subtechniques: ["T1204.001 Malicious Link", "T1204.002 Malicious File", "T1204.003 Malicious Image"]
            },
            {
              id: "T1047", code: "T1047", title: "Windows Management Instrumentation (WMI)",
              subtitle: "ใช้ WMI เพื่อสั่งรันโปรเซสทั้งในเครื่องและข้ามเครือข่าย",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1047/",
              why: "WMI เป็นฟีเจอร์มาตรฐานของ Windows ที่ช่วยให้ผู้โจมตีสั่งรันคำสั่งแบบไร้ไฟล์ (Fileless) และทำ Lateral Movement ได้",
              how: "ใช้ `wmic process call create` หรือเรียกผ่าน PowerShell CIM/WMI cmdlets",
              redTeam: "ใช้ WMI รันคำสั่งบนเครื่องปลายทางโดยไม่ต้องวางไฟล์โปรแกรมเพิ่มเติม",
              blueTeam: "เฝ้าระวังโปรเซสลูกที่ถูกสร้างโดย `wmiprvse.exe` และตรวจสอบ Windows Event ID 5857-5861",
              dataSources: ["Command Execution", "Process Creation", "WMI Creation"],
              mitigations: ["M1038 Execution Prevention", "M1026 Privileged Account Management"],
              subtechniques: ["Local WMI Process Execution", "Remote WMI Execution", "v20 New: Direct Prompt Injection", "v20 New: Indirect Prompt Injection", "v20 New: ESXi Administration Command"]
            }
          ]
        },
        {
          id: "TA0003", code: "TA0003", title: "05. Persistence (22 Techniques)",
          subtitle: "การฝังตัวเพื่อรักษาสิทธิ์การเข้าถึงระบบแม้เครื่องถูกรีสตาร์ท",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0003/",
          why: "ป้องกันไม่ให้หลุดออกจากระบบเมื่อผู้ใช้ปิดเครื่อง รีบูต หรือเปลี่ยนรหัสผ่านบางส่วน",
          how: "ตั้งเวลาทำงานอัตโนมัติ (Scheduled Task/Cron), แก้ไข Registry Run Keys, สร้าง Service ใหม่ หรือเพิ่ม SSH Key / Cloud App Credentials",
          redTeam: "เลือกวิธีฝังตัวที่กลมกลืนกับบริการปกติของระบบ เช่น Scheduled Task ที่ตั้งชื่อคล้ายบริการของ Windows",
          blueTeam: "ตรวจสอบ Autoruns, การแก้ไข Registry Run Keys (Sysmon ID 13), การสร้าง Scheduled Task (Event ID 4698) และการสร้าง Service ใหม่ (Event ID 7045)",
          dataSources: ["Scheduled Job", "Windows Registry", "Service Creation", "User Account Modification"],
          mitigations: ["M1047 Audit", "M1026 Privileged Account Management", "M1018 User Account Management"],
          children: [
            {
              id: "T1053", code: "T1053", title: "Scheduled Task/Job",
              subtitle: "ตั้งเวลาให้รันโค้ดอัตโนมัติผ่าน Task Scheduler, Cron หรือ At",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1053/",
              why: "ช่วยให้โค้ดของผู้โจมตีทำงานซ้ำตามเวลาที่กำหนดหรือทุกครั้งที่เปิดเครื่องด้วยสิทธิ์ SYSTEM ได้",
              how: "Sub-techniques: T1053.005 Scheduled Task (Windows), T1053.003 Cron (Linux), T1053.007 Container Orchestration Job",
              redTeam: "ใช้ `schtasks /create` หรือแก้ไข XML ของ Task ใน Registry เพื่อซ่อนคำสั่ง",
              blueTeam: "ตรวจจับการรัน `schtasks.exe`, Event ID 4698/4702 และตรวจสอบไฟล์ใน `C:\\Windows\\System32\\Tasks`",
              dataSources: ["Scheduled Job: Scheduled Job Creation", "Process: Process Creation"],
              mitigations: ["M1047 Audit", "M1026 Privileged Account Management", "M1018 User Account Management"],
              subtechniques: ["T1053.003 Cron", "T1053.005 Scheduled Task", "T1053.007 Container Orchestration Job"]
            },
            {
              id: "T1547", code: "T1547", title: "Boot or Logon Autostart Execution",
              subtitle: "ฝังตัวใน Registry Run Keys หรือ Startup Folder เพื่อรันตอนเปิดเครื่อง",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1547/",
              why: "เป็นวิธีฝังตัวที่ตรงไปตรงมาและทำงานทันทีเมื่อผู้ใช้ล็อกอินเข้าสู่ระบบ",
              how: "Sub-techniques: T1547.001 Registry Run Keys / Startup Folder, T1547.004 Winlogon Helper DLL, T1547.006 Kernel Modules",
              redTeam: "เพิ่มค่าใน `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run` ชี้ไปยังสคริปต์หรือไบนารี",
              blueTeam: "ใช้ Sysmon Event ID 12/13/14 ตรวจจับการแก้ไขคีย์ตระกูล Run/RunOnce และตรวจสอบโฟลเดอร์ Startup",
              dataSources: ["Windows Registry: Windows Registry Key Modification", "File: File Creation"],
              mitigations: ["M1038 Execution Prevention", "M1022 Restrict File and Directory Permissions"],
              subtechniques: ["T1547.001 Registry Run Keys / Startup Folder", "T1547.004 Winlogon Helper DLL", "T1547.006 Kernel Modules and Extensions"]
            },
            {
              id: "T1098", code: "T1098", title: "Account Manipulation",
              subtitle: "เพิ่มสิทธิ์ เพิ่มคีย์ SSH หรือเพิ่ม Cloud Secret/Certificate ให้บัญชีที่มีอยู่",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1098/",
              why: "รักษาการเข้าถึงบัญชีเดิมโดยแม้เจ้าของบัญชีจะเปลี่ยนรหัสผ่าน ผู้โจมตีก็ยังเข้าผ่านคีย์หรือ App Credential ที่แอบสร้างไว้ได้",
              how: "Sub-techniques: T1098.001 Additional Cloud Credentials, T1098.003 Additional Cloud Roles, T1098.004 SSH Authorized Keys",
              redTeam: "เพิ่ม Client Secret ใหม่ใน Entra ID Service Principal หรือใส่ Public Key ใน `~/.ssh/authorized_keys`",
              blueTeam: "ตรวจจับการเพิ่ม App Credentials ใน Cloud Audit Logs และการแก้ไขไฟล์ `authorized_keys`",
              dataSources: ["User Account: User Account Modification", "File: File Modification"],
              mitigations: ["M1026 Privileged Account Management", "M1032 Multi-factor Authentication"],
              subtechniques: ["T1098.001 Additional Cloud Credentials", "T1098.003 Additional Cloud Roles", "T1098.004 SSH Authorized Keys"]
            }
          ]
        },
        {
          id: "TA0004", code: "TA0004", title: "06. Privilege Escalation (13 Techniques)",
          subtitle: "การยกระดับสิทธิ์จากผู้ใช้ทั่วไปเป็น Administrator / SYSTEM / Root",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0004/",
          why: "สิทธิ์ผู้ใช้ทั่วไปมักไม่เพียงพอในการอ่านรหัสผ่านทั้งระบบ ปิด EDR หรือยึดครอง Domain Controller",
          how: "อาศัยช่องโหว่ของการตั้งค่า Permission, การทำ Process Injection, การข้าม UAC หรือการขโมย Access Token",
          redTeam: "รัน WinPEAS / LinPEAS หรือ SharpUp เพื่อหา Unquoted Service Paths, Weak Service Permissions, Sudoers Misconfiguration หรือ Token Impersonation (Potato family)",
          blueTeam: "บังคับใช้หลัก Least Privilege, ตรวจสอบสิทธิ์ของ Windows Services/SUID binaries และตรวจจับการสร้างโปรเซสที่มีสิทธิ์ SYSTEM ผิดปกติ",
          dataSources: ["Process Creation", "Access Token Manipulation", "OS API Execution", "Service Modification"],
          mitigations: ["M1026 Privileged Account Management", "M1047 Audit", "M1028 Operating System Configuration"],
          children: [
            {
              id: "T1548", code: "T1548", title: "Abuse Elevation Control Mechanism",
              subtitle: "หลีกเลี่ยง UAC บน Windows หรือใช้ช่องโหว่การตั้งค่า sudo/setuid บน Linux",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1548/",
              why: "ยกระดับสิทธิ์ขึ้นเป็นระดับผู้ดูแลระบบโดยไม่ให้หน้าต่างแจ้งเตือนรบกวนผู้ใช้",
              how: "Sub-techniques: T1548.001 Setuid and Setgid, T1548.002 Bypass User Account Control (fodhelper/eventvwr), T1548.003 Sudo and Sudo Caching",
              redTeam: "ใช้เทคนิค UAC Bypass ผ่าน Auto-elevated binaries หรือตรวจสอบ `sudo -l` กับ GTFOBins",
              blueTeam: "ตั้งค่า UAC เป็นระดับสูงสุด (Always Notify), ตรวจสอบไฟล์ที่มี SUID bit และจำกัดสิทธิ์ใน `/etc/sudoers`",
              dataSources: ["Process: Process Creation", "Command: Command Execution", "Windows Registry Modification"],
              mitigations: ["M1026 Privileged Account Management", "M1052 User Account Control", "M1028 Operating System Configuration"],
              subtechniques: ["T1548.001 Setuid and Setgid", "T1548.002 Bypass User Account Control", "T1548.003 Sudo and Sudo Caching"]
            },
            {
              id: "T1055", code: "T1055", title: "Process Injection",
              subtitle: "ฉีดโค้ดเข้าไปทำงานภายใต้โปรเซสอื่นที่มีสิทธิ์สูงกว่าหรือได้รับความเชื่อถือ",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1055/",
              why: "ช่วยยกระดับสิทธิ์ตามโปรเซสปลายทางและซ่อนการทำงานในโปรเซสระบบ เช่น `svchost.exe` หรือ `explorer.exe`",
              how: "Sub-techniques: T1055.001 DLL Injection, T1055.002 PE Injection, T1055.012 Process Hollowing",
              redTeam: "ใช้ API เช่น `VirtualAllocEx`, `WriteProcessMemory`, `CreateRemoteThread` หรือ Direct Syscalls",
              blueTeam: "ใช้ EDR ตรวจจับการเรียกใช้ Cross-process Memory APIs และตรวจสอบ Sysmon Event ID 8 (CreateRemoteThread) และ ID 10 (ProcessAccess)",
              dataSources: ["Process: OS API Execution", "Process: Process Access", "Module: Module Load"],
              mitigations: ["M1040 Behavior Prevention on Endpoint"],
              subtechniques: ["T1055.001 Dynamic-link Library Injection", "T1055.002 Portable Executable Injection", "T1055.012 Process Hollowing"]
            },
            {
              id: "T1134", code: "T1134", title: "Access Token Manipulation",
              subtitle: "ขโมยหรือปลอมแปลง Windows Access Token เพื่อสวมรอยเป็นผู้ใช้หรือ SYSTEM",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1134/",
              why: "ใช้สิทธิ์ `SeImpersonatePrivilege` หรือขโมย Token ของโปรเซสที่รันด้วยสิทธิ์ SYSTEM/Domain Admin",
              how: "Sub-techniques: T1134.001 Token Impersonation/Theft, T1134.002 Create Process with Token, T1134.005 SID-History Injection",
              redTeam: "ใช้เทคนิคตระกูล Potato (PrintSpoofer, GodPotato) เพื่อเปลี่ยนจาก Service Account เป็น SYSTEM",
              blueTeam: "ตรวจจับการใช้ API `DuplicateTokenEx`, `ImpersonateLoggedOnUser` และจำกัดสิทธิ์ `SeDebugPrivilege` / `SeImpersonatePrivilege`",
              dataSources: ["Process: Access Token Manipulation", "Process: OS API Execution"],
              mitigations: ["M1026 Privileged Account Management"],
              subtechniques: ["T1134.001 Token Impersonation/Theft", "T1134.002 Create Process with Token", "T1134.005 SID-History Injection"]
            }
          ]
        },
        {
          id: "TA0005", code: "TA0005", title: "07. Stealth (31 Techniques)",
          subtitle: "การซ่อนเร้นและพรางตัวให้ดูเหมือนพฤติกรรมปกติ (อัปเดตชื่อใหม่ใน ATT&CK v20)",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0005/",
          why: "ผู้โจมตีต้องการซ่อนและอำพรางการกระทำของตนให้กลมกลืนไปกับการทำงานปกติของระบบ (The adversary is trying to hide and conceal their actions)",
          how: "พรางโค้ด (Obfuscation T1027), ลบร่องรอย (Indicator Removal T1070), ใช้โปรแกรมของระบบเอง (LOLBins T1218), Masquerading และ Process Injection",
          redTeam: "ใช้เทคนิค Living off the Land (LOLBins), เข้ารหัสสตริงใน Payload และหลีกเลี่ยงการเขียนไฟล์ลงดิสก์",
          blueTeam: "ใช้ Detection Strategies & Behavioral Analytics ตรวจจับความผิดปกติของพารามิเตอร์โปรเซสและหน่วยความจำ",
          dataSources: ["Process Creation", "Command Execution", "Module Load", "File Metadata"],
          mitigations: ["M1040 Behavior Prevention on Endpoint", "M1038 Execution Prevention", "M1049 Antivirus/Antimalware"],
          children: [
            {
              id: "T1070", code: "T1070", title: "Indicator Removal",
              subtitle: "ลบร่องรอยการโจมตี ล้าง Event Logs ลบไฟล์ หรือปลอมแปลงเวลาไฟล์ (Timestomp)",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1070/",
              why: "ขัดขวางการทำ Digital Forensics และการสืบสวนย้อนหลังของทีม Incident Response",
              how: "Sub-techniques: T1070.001 Clear Windows Event Logs (`wevtutil cl`), T1070.003 Clear Command History, T1070.004 File Deletion, T1070.006 Timestomp",
              redTeam: "ลบไฟล์ชั่วคราวที่วางไว้และล้างประวัติคำสั่งหลังเสร็จสิ้นภารกิจ",
              blueTeam: "ส่ง Log ไปยัง SIEM แบบ Real-time และสร้าง Alert ทันทีเมื่อเกิด Event ID 1102 (Security Log Cleared) หรือ Event ID 104 (System Log Cleared)",
              dataSources: ["Windows Event Logs (ID 1102 / 104)", "File Deletion", "Command Execution"],
              mitigations: ["M1029 Remote Data Storage", "M1022 Restrict File and Directory Permissions"],
              subtechniques: ["T1070.001 Clear Windows Event Logs", "T1070.003 Clear Command History", "T1070.004 File Deletion", "T1070.006 Timestomp"]
            },
            {
              id: "T1027", code: "T1027", title: "Obfuscated Files or Information",
              subtitle: "เข้ารหัส บีบอัด หรือพรางโค้ด/คำสั่งเพื่อหลบเลี่ยง Signature Detection",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1027/",
              why: "ทำให้ระบบตรวจจับไฟล์แบบ Static ไม่สามารถอ่านเนื้อหาที่แท้จริงของมัลแวร์หรือสคริปต์ได้",
              how: "Sub-techniques: T1027.002 Software Packing, T1027.007 Dynamic API Resolution, T1027.010 Command Obfuscation",
              redTeam: "ใช้ String Encryption, Base64/XOR Encoding และการสลับตัวอักษรในคำสั่ง",
              blueTeam: "ใช้ AMSI เพื่อตรวจจับโค้ดหลังถูกถอดรหัสในหน่วยความจำ และวัดค่า Entropy ของคำสั่งใน Command Line",
              dataSources: ["Script Execution", "Command Execution", "File Metadata"],
              mitigations: ["M1049 Antivirus/Antimalware", "M1040 Behavior Prevention on Endpoint"],
              subtechniques: ["T1027.002 Software Packing", "T1027.007 Dynamic API Resolution", "T1027.010 Command Obfuscation"]
            },
            {
              id: "T1218", code: "T1218", title: "System Binary Proxy Execution (LOLBins)",
              subtitle: "ใช้ไฟล์ไบนารีมาตรฐานของ Windows รันโค้ดอันตรายแทน (rundll32, regsvr32, mshta)",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1218/",
              why: "ไฟล์ของ Microsoft มี Digital Signature ที่ถูกต้อง จึงมักผ่านเกณฑ์การอนุญาตของระบบความปลอดภัยพื้นฐาน",
              how: "Sub-techniques: T1218.005 Mshta, T1218.010 Regsvr32, T1218.011 Rundll32, T1218.004 InstallUtil",
              redTeam: "ใช้ `rundll32.exe` หรือ `regsvr32.exe /s /n /u /i:http://... scrobj.dll` เพื่อโหลดและรันโค้ด",
              blueTeam: "ตรวจจับเมื่อ `rundll32.exe`, `mshta.exe`, `regsvr32.exe` หรือ `certutil.exe` เชื่อมต่อออกสู่อินเทอร์เน็ตหรือรันจากโฟลเดอร์ชั่วคราว",
              dataSources: ["Process Creation", "Network Connection Creation", "Module Load"],
              mitigations: ["M1038 Execution Prevention", "M1050 Exploit Protection"],
              subtechniques: ["T1218.005 Mshta", "T1218.010 Regsvr32", "T1218.011 Rundll32"]
            }
          ]
        },
        {
          id: "TA0112", code: "TA0112", title: "08. Defense Impairment (18 Techniques • v20 New)",
          subtitle: "การทำลายหรือปิดกลไกป้องกันและระบบ Log ไม่ให้ฝ่ายป้องกันมองเห็นหรือเชื่อถือข้อมูลได้",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/enterprise/",
          why: "ใน ATT&CK v20 ได้แยก Defense Impairment (TA0112) ออกมาจาก Stealth เพื่อเน้นพฤติกรรมที่ผู้โจมตีมุ่งทำลายระบบป้องกัน ปิด EDR/Firewall หรือตัดท่อส่ง Log โดยตรง",
          how: "ปิดหรือแก้ไขเครื่องมือความปลอดภัย (Disable or Modify Tools), ปิด Firewall, ดัดแปลงนโยบาย Domain/Tenant, Subvert Trust Controls และ Safe Mode Boot",
          redTeam: "ทดสอบ AMSI/ETW Bypass, ตรวจสอบ Tamper Protection ของ EDR และการแก้ไข Cloud Logging Configurations",
          blueTeam: "เปิดใช้ EDR Tamper Protection, ส่ง Log ไปยัง SIEM แบบ Immutable/Real-time และตั้ง Alert วิกฤตทันทีเมื่อ Sensor หยุดส่งข้อมูล",
          dataSources: ["Sensor Health: Host Status", "Command Execution", "Service Metadata", "Cloud Audit Logs"],
          mitigations: ["M1029 Remote Data Storage", "M1026 Privileged Account Management", "M1022 Restrict File and Directory Permissions"],
          children: [
            {
              id: "T1562", code: "T1562", title: "Disable or Modify Tools & Firewalls",
              subtitle: "ปิดการทำงานของ EDR, Antivirus, Windows Event Log, Cloud Log หรือ System Firewall",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1562/",
              why: "ตัดการมองเห็นของทีม SOC ก่อนลงมือขั้นรุนแรง เช่น การปล่อยแรนซัมแวร์หรือการขโมยข้อมูล",
              how: "ครอบคลุม Disable or Modify Windows Event Log, Disable or Modify Cloud Log, Impair Autonomous Defenses และ Disable System Firewall",
              redTeam: "ทดสอบหยุด Service ของ Agent หรือรันคำสั่งปิด Real-time Monitoring และ Firewall",
              blueTeam: "เปิดใช้ Tamper Protection, ตั้ง Alert ระดับวิกฤตทันทีเมื่อ Agent ขาดการติดต่อหรือมีการรัน `Set-MpPreference -DisableRealtimeMonitoring`",
              dataSources: ["Sensor Health: Host Status", "Command Execution", "Service Metadata"],
              mitigations: ["M1022 Restrict File and Directory Permissions", "M1026 Privileged Account Management", "EDR Tamper Protection"],
              subtechniques: ["T1562.001 Disable or Modify Tools", "T1562.002 Disable Windows Event Logging", "T1562.004 Disable System Firewall", "Impair Autonomous Defenses"]
            },
            {
              id: "T1553", code: "T1553", title: "Subvert Trust Controls",
              subtitle: "ทำลายความน่าเชื่อถือของใบรับรองดิจิทัล Code Signing หรือ Mark-of-the-Web (MOTW)",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1553/",
              why: "หลอกให้ระบบปฏิบัติการเชื่อว่าไฟล์อันตรายได้รับการรับรองอย่างถูกต้องหรือมาจากแหล่งที่ปลอดภัย",
              how: "Sub-techniques: Gatekeeper Bypass, Code Signing, Install Root Certificate, Mark-of-the-Web Bypass",
              redTeam: "ใช้คอนเทนเนอร์ไฟล์หรือโครงสร้าง Archive ที่ข้ามการติดแท็ก Mark-of-the-Web",
              blueTeam: "ตรวจสอบการติดตั้ง Root Certificate ใหม่ในเครื่อง (Sysmon ID 13) และตรวจสอบความถูกต้องของใบรับรอง Code Signing",
              dataSources: ["Windows Registry Modification", "File Metadata", "Certificate Logs"],
              mitigations: ["M1045 Code Signing", "M1028 Operating System Configuration"],
              subtechniques: ["T1553.002 Code Signing", "T1553.004 Install Root Certificate", "T1553.005 Mark-of-the-Web Bypass"]
            }
          ]
        },
        {
          id: "TA0006", code: "TA0006", title: "09. Credential Access (18 Techniques)",
          subtitle: "การขโมยชื่อบัญชี รหัสผ่าน ค่า Hash หรือตั๋วพิสูจน์ตัวตน (Kerberos/Tokens)",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0006/",
          why: "เมื่อได้รหัสผ่านหรือ Hash ของผู้ดูแลระบบ ผู้โจมตีจะสามารถขยายผลไปยังเครื่องอื่นทั่วทั้งองค์กรได้โดยง่าย",
          how: "ดึงข้อมูลจาก LSASS memory, โจมตีฐานข้อมูล Active Directory (NTDS.dit), ทำ Kerberoasting หรือสุ่มรหัสผ่าน (Password Spraying)",
          redTeam: "ใช้เทคนิค Kerberoasting, ดึงรหัสผ่านที่เก็บไว้ในไฟล์ตั้งค่า หรือทดสอบดัมพ์ LSASS เมื่อได้สิทธิ์ผู้ดูแลเครื่อง",
          blueTeam: "เปิดใช้งาน Windows Defender Credential Guard (LSA Protection), เฝ้าระวังการเข้าถึงโปรเซส `lsass.exe` (Sysmon ID 10) และตรวจจับ Event ID 4769 (Kerberos RC4 Ticket Request)",
          dataSources: ["Process Access (LSASS)", "Active Directory Authentication Logs", "Command Execution", "Windows Registry"],
          mitigations: ["M1043 Credential Access Protection (Credential Guard)", "M1026 Privileged Account Management", "M1032 Multi-factor Authentication"],
          children: [
            {
              id: "T1003", code: "T1003", title: "OS Credential Dumping",
              subtitle: "ดึงรหัสผ่านหรือ Hash จากหน่วยความจำ LSASS, ไฟล์ SAM หรือฐานข้อมูล NTDS.dit (เช่น Mimikatz S0002)",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1003/",
              why: "เป็นหัวใจสำคัญในการได้มาซึ่ง NTLM Hash หรือรหัสผ่านเพื่อทำ Pass-the-Hash และยึดครอง Domain",
              how: "Sub-techniques: T1003.001 LSASS Memory, T1003.002 Security Account Manager (SAM), T1003.003 NTDS, T1003.006 DCSync",
              redTeam: "ใช้ Mimikatz (S0002), Nanodump, `comsvcs.dll MiniDump`, `ntdsutil` หรือเทคนิค DCSync",
              blueTeam: "เปิด RunAsPPL / Credential Guard, ตั้งกฎตรวจจับ Sysmon ID 10 ที่เข้าถึง `lsass.exe` และตรวจจับ DCSync (Event ID 4662 บน Domain Controller)",
              dataSources: ["Process: Process Access", "Command: Command Execution", "Active Directory: AD Object Access"],
              mitigations: ["M1043 Credential Access Protection", "M1026 Privileged Account Management", "M1027 Password Policies"],
              subtechniques: ["T1003.001 LSASS Memory", "T1003.002 Security Account Manager", "T1003.003 NTDS", "T1003.006 DCSync"]
            },
            {
              id: "T1110", code: "T1110", title: "Brute Force & Password Spraying",
              subtitle: "คาดเดารหัสผ่าน สุ่มรหัสผ่านยอดนิยมกับหลายบัญชี หรือใช้ Credential Stuffing",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1110/",
              why: "ค้นหาบัญชีที่ใช้รหัสผ่านอ่อนแอหรือใช้รหัสผ่านซ้ำกับบริการภายนอกที่เคยรั่วไหล",
              how: "Sub-techniques: T1110.001 Password Guessing, T1110.002 Password Cracking, T1110.003 Password Spraying, T1110.004 Credential Stuffing",
              redTeam: "ทำ Low-and-slow Password Spraying เพื่อไม่ให้บัญชีถูกล็อก (Account Lockout)",
              blueTeam: "ตรวจจับความล้มเหลวในการล็อกอินกระจายหลายบัญชีจาก IP เดียวกัน (Event ID 4625 / Entra ID Sign-in Logs) และบังคับใช้ MFA",
              dataSources: ["User Account: User Account Authentication"],
              mitigations: ["M1032 Multi-factor Authentication", "M1036 Account Use Policies", "M1027 Password Policies"],
              subtechniques: ["T1110.001 Password Guessing", "T1110.003 Password Spraying", "T1110.004 Credential Stuffing"]
            },
            {
              id: "T1558", code: "T1558", title: "Steal or Forge Kerberos Tickets",
              subtitle: "โจมตีระบบ Kerberos เช่น Kerberoasting, AS-REP Roasting, Golden/Silver Ticket",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1558/",
              why: "ดึงตั๋วของ Service Account มาแคร็กแบบออฟไลน์ หรือสร้างตั๋วปลอมเพื่อเข้าถึงทุกเครื่องในโดเมน",
              how: "Sub-techniques: T1558.001 Golden Ticket, T1558.002 Silver Ticket, T1558.003 Kerberoasting, T1558.004 AS-REP Roasting",
              redTeam: "ใช้ Rubeus หรือ Impacket `GetUserSPNs.py` ขอ TGS Ticket ของ Service Account แล้วนำไปแคร็กด้วย Hashcat",
              blueTeam: "ใช้ Group Managed Service Accounts (gMSA) หรือรหัสผ่านยาว >25 ตัวอักษร, ปิดการเข้ารหัส RC4 (บังคับ AES) และเฝ้าระวัง Event ID 4769 (Encryption Type 0x17)",
              dataSources: ["Active Directory: Active Directory Credential Request"],
              mitigations: ["M1026 Privileged Account Management", "M1027 Password Policies", "M1041 Encrypt Sensitive Information (AES Kerberos)"],
              subtechniques: ["T1558.001 Golden Ticket", "T1558.002 Silver Ticket", "T1558.003 Kerberoasting", "T1558.004 AS-REP Roasting"]
            },
            {
              id: "T1552", code: "T1552", title: "Unsecured Credentials",
              subtitle: "ค้นหารหัสผ่านหรือ API Key ที่เก็บไว้แบบไม่ปลอดภัยในไฟล์ สคริปต์ หรือสภาพแวดล้อม",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1552/",
              why: "นักพัฒนาหรือผู้ดูแลระบบมักเผลอเก็บรหัสผ่านไว้ในไฟล์ `.env`, Group Policy Preferences หรือ Private Keys",
              how: "Sub-techniques: T1552.001 Credentials In Files, T1552.004 Private Keys, T1552.005 Cloud Instance Metadata API",
              redTeam: "ใช้ Snaffler หรือ TruffleHog ค้นหารหัสผ่านใน File Share และ Git Repositories",
              blueTeam: "ใช้ Secret Management Vault, สแกนหาฮาร์ดโค้ดคีย์ในโค้ด และบังคับใช้ IMDSv2 บน Cloud",
              dataSources: ["Command Execution", "File Access"],
              mitigations: ["M1047 Audit", "M1022 Restrict File and Directory Permissions", "M1027 Password Policies"],
              subtechniques: ["T1552.001 Credentials In Files", "T1552.004 Private Keys", "T1552.005 Cloud Instance Metadata API"]
            }
          ]
        },
        {
          id: "TA0007", code: "TA0007", title: "10. Discovery (34 Techniques)",
          subtitle: "การสำรวจสภาพแวดล้อมภายในระบบและเครือข่ายหลังเจาะเข้ามาได้",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0007/",
          why: "ผู้โจมตีต้องทำความเข้าใจว่าตนเองอยู่ที่ไหน มีสิทธิ์อะไร และเซิร์ฟเวอร์สำคัญหรือ Domain Controller อยู่ที่ใด",
          how: "รันคำสั่งสำรวจระบบ (`whoami`, `ipconfig`, `nltest`, `net group`) หรือใช้เครื่องมือวาดกราฟสิทธิ์อย่าง BloodHound/SharpHound",
          redTeam: "เก็บข้อมูลโครงสร้าง Active Directory และเส้นทางสิทธิ์เพื่อวางแผน Lateral Movement ที่สั้นและเงียบที่สุด",
          blueTeam: "ตรวจจับการรันคำสั่งสำรวจระบบหลายคำสั่งต่อเนื่องกันในเวลาสั้นๆ (Discovery Burst) และการคิวรี LDAP จำนวนมากจากเครื่องผู้ใช้งานทั่วไป",
          dataSources: ["Process Creation", "Command Execution", "Network Traffic Flow", "LDAP Queries"],
          mitigations: ["จำกัดสิทธิ์การคิวรี Active Directory ที่ไม่จำเป็น และใช้ EDR Behavioral Detection"],
          children: [
            {
              id: "T1087", code: "T1087", title: "Account Discovery",
              subtitle: "ค้นหารายชื่อบัญชีผู้ใช้และกลุ่มผู้ดูแลระบบในเครื่อง แอปพลิเคชัน หรือโดเมน",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1087/",
              why: "ระบุว่าบัญชีใดมีสิทธิ์เป็น Domain Admin, Enterprise Admin หรือ Global Admin บน Cloud",
              how: "Sub-techniques: T1087.001 Local Account, T1087.002 Domain Account (`net group \"Domain Admins\" /domain`), T1087.004 Cloud Account",
              redTeam: "ใช้ SharpHound หรือ LDAP query เพื่อดึงโครงสร้างกลุ่มผู้ดูแลระบบแทนการใช้ `net.exe` ตรงๆ",
              blueTeam: "เฝ้าระวังการเรียกใช้ `net.exe` / `net1.exe` และการส่ง LDAP Query ที่ดึงข้อมูลทุก Object พร้อมกัน",
              dataSources: ["Command Execution", "Process Creation", "Network Traffic Content (LDAP)"],
              mitigations: ["M1028 Operating System Configuration"],
              subtechniques: ["T1087.001 Local Account", "T1087.002 Domain Account", "T1087.004 Cloud Account"]
            },
            {
              id: "T1082", code: "T1082", title: "System Information Discovery",
              subtitle: "ตรวจสอบข้อมูลระบบปฏิบัติการ ฮาร์ดแวร์ ชื่อเครื่อง และแพตช์",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1082/",
              why: "ดูว่าเครื่องที่ยึดได้เป็นเครื่องจริงหรือ Sandbox และมีช่องโหว่ Kernel/OS ใดที่ยังไม่ได้แพตช์",
              how: "ใช้คำสั่ง `systeminfo`, `hostname`, `uname -a` หรืออ่านจาก Registry / Cloud Metadata",
              redTeam: "ตรวจสอบสภาพแวดล้อมก่อนตัดสินใจโหลดเครื่องมือขั้นถัดไป",
              blueTeam: "ตรวจจับพฤติกรรมการรันคำสั่งสำรวจระบบต่อจากโปรเซสของ Office หรือ Web Server",
              dataSources: ["Process Creation", "Command Execution"],
              mitigations: ["Behavioral Correlation in SIEM/EDR"],
              subtechniques: ["Host OS & Patch Enumeration", "Cloud Instance Environment Discovery"]
            },
            {
              id: "T1046", code: "T1046", title: "Network Service Discovery",
              subtitle: "สแกนหาเครื่องและพอร์ตบริการที่เปิดอยู่ในเครือข่ายภายใน (Internal Scanning)",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1046/",
              why: "ค้นหาเซิร์ฟเวอร์ฐานข้อมูล, File Server, Domain Controller หรือเครื่องที่เปิด SMB/RDP/WinRM",
              how: "สแกนพอร์ต 445, 3389, 5985, 22, 1433, 3306 ภายในวงแลน",
              redTeam: "สแกนเฉพาะพอร์ตเป้าหมายอย่างช้าๆ เพื่อหลีกเลี่ยงการทริกเกอร์ NDR/Firewall",
              blueTeam: "ใช้ Network Segmentation และตั้ง NDR/Internal Firewall ตรวจจับเมื่อเครื่อง Workstation สแกนพอร์ตไปยังหลายเครื่องในวงแลน",
              dataSources: ["Network Traffic Flow", "Process Creation"],
              mitigations: ["M1030 Network Segmentation", "M1031 Network Intrusion Prevention"],
              subtechniques: ["Internal Port Scanning", "Active Directory Subnet & Service Enumeration"]
            }
          ]
        },
        {
          id: "TA0008", code: "TA0008", title: "11. Lateral Movement (9 Techniques)",
          subtitle: "การเคลื่อนย้ายข้ามไปยังเครื่องหรือระบบอื่นๆ ภายในเครือข่าย",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0008/",
          why: "ขยายการควบคุมจากเครื่องเริ่มต้น (Patient Zero) ไปยังเซิร์ฟเวอร์เป้าหมายหรือ Domain Controller",
          how: "ใช้บริการรีโมตภายใน (RDP, SMB/Windows Admin Shares, WinRM, SSH, PsExec) ร่วมกับรหัสผ่านหรือ Hash/Ticket ที่ขโมยมาได้",
          redTeam: "ใช้ Pass-the-Hash, Pass-the-Ticket, WinRM หรือ WMI/DCOM เพื่อกระโดดไปยังเครื่องเป้าหมายโดยไม่ต้องรู้รหัสผ่านแบบข้อความจริง",
          blueTeam: "ทำ Network Micro-segmentation (ห้าม Workstation เชื่อมต่อ SMB/RDP หากันเอง), แยก Tier ของบัญชี Admin และตรวจจับ Event ID 4624 Logon Type 3 และ 10",
          dataSources: ["Logon Session Creation", "Network Traffic Flow", "Named Pipe Metadata", "Service Creation"],
          mitigations: ["M1030 Network Segmentation", "M1026 Privileged Account Management", "M1032 Multi-factor Authentication"],
          children: [
            {
              id: "T1021", code: "T1021", title: "Remote Services",
              subtitle: "เข้าควบคุมเครื่องอื่นผ่าน RDP, SMB/Admin Shares, WinRM, SSH หรือ VNC",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1021/",
              why: "ใช้ช่องทางบริหารจัดการระบบมาตรฐานขององค์กรในการเคลื่อนย้ายข้ามเครื่อง",
              how: "Sub-techniques: T1021.001 Remote Desktop Protocol, T1021.002 SMB/Windows Admin Shares (`C$`, `ADMIN$`), T1021.004 SSH, T1021.006 Windows Remote Management (WinRM)",
              redTeam: "ใช้ Impacket (`psexec.py`, `wmiexec.py`, `smbexec.py`) หรือ Evil-WinRM เพื่อรันคำสั่งข้ามเครื่อง",
              blueTeam: "ปิดการใช้งาน `ADMIN$` สำหรับเครื่องทั่วไป, บังคับใช้ Windows Firewall ป้องกัน Workstation-to-Workstation SMB/RDP และเฝ้าระวังโปรเซสลูกของ `wsmprovhost.exe`",
              dataSources: ["Logon Session: Logon Session Creation", "Network Traffic: Network Traffic Flow", "Process: Process Creation"],
              mitigations: ["M1030 Network Segmentation", "M1032 Multi-factor Authentication", "M1026 Privileged Account Management"],
              subtechniques: ["T1021.001 Remote Desktop Protocol", "T1021.002 SMB/Windows Admin Shares", "T1021.004 SSH", "T1021.006 Windows Remote Management"]
            },
            {
              id: "T1550", code: "T1550", title: "Use Alternate Authentication Material",
              subtitle: "ใช้ Pass-the-Hash, Pass-the-Ticket หรือ Web Session Cookie แทนรหัสผ่านจริง",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1550/",
              why: "ข้ามขั้นตอนการกรอกรหัสผ่านและบางครั้งสามารถข้าม MFA ได้หากขโมย Session Token/Cookie ที่ผ่านการยืนยันตัวตนแล้ว",
              how: "Sub-techniques: T1550.001 Application Access Token, T1550.002 Pass the Hash, T1550.003 Pass the Ticket, T1550.004 Web Session Cookie",
              redTeam: "ใช้ NTLM Hash หรือ Kerberos Ticket ในการล็อกอินเข้าเซิร์ฟเวอร์ หรือขโมยคุกกี้เซสชันเบราว์เซอร์",
              blueTeam: "จำกัดการใช้ NTLM ในเครือข่าย, เปิดใช้ Extended Protection for Authentication และใช้ Conditional Access ผูกกับอุปกรณ์ (Device Compliance / Token Binding)",
              dataSources: ["Logon Session Creation", "User Account Authentication", "Web Credential Usage"],
              mitigations: ["M1026 Privileged Account Management", "M1027 Password Policies", "Token Protection / Conditional Access"],
              subtechniques: ["T1550.001 Application Access Token", "T1550.002 Pass the Hash", "T1550.003 Pass the Ticket", "T1550.004 Web Session Cookie"]
            }
          ]
        },
        {
          id: "TA0009", code: "TA0009", title: "12. Collection (17 Techniques)",
          subtitle: "การรวบรวมและบีบอัดข้อมูลสำคัญของเป้าหมายก่อนนำออก",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0009/",
          why: "ผู้โจมตีต้องการคัดเลือกเฉพาะข้อมูลที่มีมูลค่าสูง (เช่น ฐานข้อมูลลูกค้า เอกสารการเงิน อีเมลผู้บริหาร หรือซอร์สโค้ด) และบีบอัดเตรียมส่งออก",
          how: "ค้นหาและดึงไฟล์จาก File Share, SharePoint/OneDrive, กล่องอีเมล และบีบอัดไฟล์ด้วย 7-Zip/WinRAR พร้อมตั้งรหัสผ่าน",
          redTeam: "ค้นหาเอกสารสำคัญตามคำค้น (เช่น 'confidential', 'password', 'contract') และทดสอบการบีบอัดข้อมูลจำลอง",
          blueTeam: "ใช้ DLP (Data Loss Prevention), ตรวจจับการอ่านไฟล์จำนวนมากผิดปกติจาก File Server/SharePoint และการรันคำสั่ง `7z.exe` / `rar.exe` ในโฟลเดอร์ชั่วคราว",
          dataSources: ["File Access", "Command Execution", "Process Creation", "Cloud Storage Audit Logs"],
          mitigations: ["M1057 Data Loss Prevention", "M1022 Restrict File and Directory Permissions", "M1047 Audit"],
          children: [
            {
              id: "T1560", code: "T1560", title: "Archive Collected Data",
              subtitle: "บีบอัดและเข้ารหัสข้อมูลที่รวบรวมได้ (7-Zip, WinRAR, tar, zip) ก่อนส่งออก",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1560/",
              why: "ลดขนาดไฟล์เพื่อให้ส่งออกได้เร็วขึ้น และตั้งรหัสผ่านเพื่อไม่ให้ระบบ DLP อ่านเนื้อหาข้างในได้",
              how: "Sub-techniques: T1560.001 Archive via Utility (`7z.exe a -p`), T1560.002 Archive via Library, T1560.003 Archive via Custom Method",
              redTeam: "ใช้ `7z.exe` หรือ PowerShell `Compress-Archive` รวบรวมข้อมูลไว้ใน Staging Directory",
              blueTeam: "สร้างกฎ EDR ดักจับการรัน `7z.exe` หรือ `rar.exe` พร้อมพารามิเตอร์ `-p` (ใส่รหัสผ่าน) โดยเฉพาะบนเซิร์ฟเวอร์",
              dataSources: ["Process: Process Creation", "Command: Command Execution", "File: File Creation"],
              mitigations: ["M1047 Audit", "M1057 Data Loss Prevention"],
              subtechniques: ["T1560.001 Archive via Utility", "T1560.002 Archive via Library", "T1560.003 Archive via Custom Method"]
            },
            {
              id: "T1114", code: "T1114", title: "Email Collection",
              subtitle: "ดึงข้อมูลอีเมลจากเครื่องผู้ใช้หรือจากเซิร์ฟเวอร์ Exchange / Microsoft 365",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1114/",
              why: "กล่องอีเมลของผู้บริหารและฝ่ายไอทีมีทั้งข้อมูลธุรกิจสำคัญและข้อมูลการตั้งค่าระบบ",
              how: "Sub-techniques: T1114.001 Local Email Collection (.pst/.ost), T1114.002 Remote Email Collection (Graph API / EWS), T1114.003 Email Forwarding Rule",
              redTeam: "ใช้สิทธิ์ OAuth App หรือตั้งกฎ Auto-Forwarding เพื่อดึงอีเมลสำคัญ",
              blueTeam: "บล็อกการตั้งค่า Auto-Forward อีเมลออกนอกโดเมนองค์กร และเฝ้าระวังการเข้าถึง MailItemsAccessed จำนวนมากใน Microsoft Purview",
              dataSources: ["Application Log: Email Access Logs", "File Access"],
              mitigations: ["M1047 Audit", "M1054 Software Configuration (Block External Auto-Forwarding)"],
              subtechniques: ["T1114.001 Local Email Collection", "T1114.002 Remote Email Collection", "T1114.003 Email Forwarding Rule"]
            }
          ]
        },
        {
          id: "TA0011", code: "TA0011", title: "13. Command and Control (18 Techniques)",
          subtitle: "การติดต่อสื่อสารระหว่างเครื่องที่ถูกยึดกับเซิร์ฟเวอร์ควบคุมของผู้โจมตี",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0011/",
          why: "เป็นช่องทางรับคำสั่งเพิ่มเติม ดาวน์โหลดเครื่องมือ และควบคุมเครื่องที่ติดเชื้อมัลแวร์จากระยะไกล",
          how: "ซ่อนทราฟฟิกในโปรโตคอลมาตรฐาน เช่น HTTPS, DNS, ใช้บริการ Cloud/Chat ยอดนิยม (Telegram, Slack, Discord, OneDrive) หรือใช้ Proxy/Tunneling",
          redTeam: "ตั้งค่า Malleable C2 Profile ให้มีลักษณะเหมือนทราฟฟิกเว็บปกติและตั้งค่า Jitter/Sleep เพื่อเลี่ยงการตรวจจับ Beaconing",
          blueTeam: "ตรวจจับทราฟฟิก Beaconing ที่ติดต่อออกเป็นจังหวะสม่ำเสมอ, ตรวจสอบ JA3/JA4 TLS Fingerprints, เฝ้าระวัง DNS Tunneling และบล็อกเครื่องมือ Remote Access ที่ไม่ได้รับอนุญาต (เช่น AnyDesk, RustDesk, ngrok)",
          dataSources: ["Network Traffic Flow", "Network Traffic Content", "DNS Logs", "Process Creation"],
          mitigations: ["M1031 Network Intrusion Prevention", "M1021 Restrict Web-Based Content", "M1037 Filter Network Traffic"],
          children: [
            {
              id: "T1071", code: "T1071", title: "Application Layer Protocol",
              subtitle: "ซ่อนการสื่อสาร C2 ในโปรโตคอลเว็บ (HTTP/HTTPS), DNS หรือเมล",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1071/",
              why: "พอร์ต 80, 443 และ 53 มักถูกเปิดอนุญาตให้ผ่าน Firewall ของทุกองค์กรอยู่แล้ว",
              how: "Sub-techniques: T1071.001 Web Protocols (HTTPS), T1071.004 DNS (DNS Tunneling)",
              redTeam: "ใช้ HTTPS C2 พร้อมใบรับรองจริงหรือใช้ DNS TXT/AAAA records ส่งข้อมูลคำสั่ง",
              blueTeam: "ใช้ SSL/TLS Inspection, วิเคราะห์ความยาวและ Entropy ของ DNS Query และตรวจจับ HTTP User-Agent หรือ JA3/JA4 ที่ผิดปกติ",
              dataSources: ["Network Traffic: Network Traffic Content", "Network Traffic: Network Traffic Flow"],
              mitigations: ["M1031 Network Intrusion Prevention", "M1037 Filter Network Traffic"],
              subtechniques: ["T1071.001 Web Protocols", "T1071.002 File Transfer Protocols", "T1071.004 DNS"]
            },
            {
              id: "T1219", code: "T1219", title: "Remote Access Software",
              subtitle: "ติดตั้งซอฟต์แวร์รีโมตถูกต้องตามกฎหมาย (AnyDesk, TeamViewer, ScreenConnect) เป็น C2",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1219/",
              why: "โปรแกรมรีโมตมาตรฐานไม่ถูก Antivirus จับว่าเป็นมัลแวร์ และช่วยให้ผู้โจมตีควบคุมหน้าจอหรือโอนไฟล์ได้ทันที",
              how: "แอบติดตั้งในโหมด Silent/Unattended บนเครื่องเซิร์ฟเวอร์หรือเครื่องผู้ใช้",
              redTeam: "ทดสอบว่าองค์กรอนุญาตให้รันโปรแกรม Remote Monitoring & Management (RMM) ที่ไม่ได้อยู่ในรายการมาตรฐานหรือไม่",
              blueTeam: "ใช้ Application Whitelisting และบล็อกโดเมน/การติดตั้งโปรแกรม RMM นอกเหนือจากที่ฝ่ายไอทีอนุมัติ",
              dataSources: ["Process Creation", "Network Connection Creation", "Network Traffic Flow"],
              mitigations: ["M1038 Execution Prevention", "M1037 Filter Network Traffic"],
              subtechniques: ["Unauthorized RMM Tool Abuse (AnyDesk, RustDesk, ScreenConnect, Atera)"]
            },
            {
              id: "T1090", code: "T1090", title: "Proxy & Tunneling",
              subtitle: "ใช้ Proxy หลายชั้นหรือสร้าง Tunnel (SOCKS, Chisel, ngrok, Cloudflare Tunnel) เข้าสู่เครือข่ายใน",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1090/",
              why: "เชื่อมต่อจากภายนอกทะลุเข้ามาถึงเซิร์ฟเวอร์ในวงแลนที่ไม่ได้ต่ออินเทอร์เน็ตโดยตรง",
              how: "Sub-techniques: T1090.001 Internal Proxy, T1090.002 External Proxy, T1090.003 Multi-hop Proxy",
              redTeam: "ใช้ Ligolo-ng, Chisel หรือ `netsh interface portproxy` เพื่อสร้างทางเชื่อมภายในเครือข่าย",
              blueTeam: "ตรวจจับการรัน `netsh portproxy`, เฝ้าระวังการเชื่อมต่อ WebSocket/SSH ที่เปิดค้างไว้นานผิดปกติ และบล็อกบริการ Tunnel สาธารณะ",
              dataSources: ["Network Traffic Flow", "Command Execution", "Process Creation"],
              mitigations: ["M1037 Filter Network Traffic", "M1031 Network Intrusion Prevention"],
              subtechniques: ["T1090.001 Internal Proxy", "T1090.002 External Proxy", "T1090.003 Multi-hop Proxy"]
            }
          ]
        },
        {
          id: "TA0010", code: "TA0010", title: "14. Exfiltration (10 Techniques)",
          subtitle: "การลักลอบนำข้อมูลสำคัญออกจากเครือข่ายองค์กร",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0010/",
          why: "บรรลุเป้าหมายการจารกรรมข้อมูล หรือนำข้อมูลไปใช้ข่มขู่เรียกค่าไถ่ (Double Extortion)",
          how: "ส่งออกผ่านช่องทาง C2 เดิม, อัปโหลดขึ้น Cloud Storage สาธารณะ (MEGA, Rclone, S3, Dropbox) หรือส่งผ่านโปรโตคอลสำรอง",
          redTeam: "ทดสอบส่งข้อมูลจำลอง (Dummy Data) ออกผ่าน HTTPS หรือบริการ Cloud เพื่อวัดผลระบบ DLP และ CASB",
          blueTeam: "เฝ้าระวังปริมาณข้อมูลขาออก (Outbound Data Volume Spike), บล็อกบริการ Cloud Storage ที่ไม่อนุญาตด้วย CASB/Proxy และตรวจจับการรัน `rclone.exe` หรือ `curl` อัปโหลดไฟล์",
          dataSources: ["Network Traffic Flow", "Network Traffic Content", "Command Execution", "File Access"],
          mitigations: ["M1057 Data Loss Prevention", "M1037 Filter Network Traffic", "M1021 Restrict Web-Based Content"],
          children: [
            {
              id: "T1567", code: "T1567", title: "Exfiltration Over Web Service",
              subtitle: "อัปโหลดข้อมูลออกไปยังบริการ Cloud Storage หรือ Code Repository (MEGA, Dropbox, S3)",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1567/",
              why: "ส่งข้อมูลปริมาณมากได้อย่างรวดเร็วและถูกเข้ารหัสด้วย HTTPS ของผู้ให้บริการ Cloud",
              how: "Sub-techniques: T1567.001 Exfiltration to Code Repository, T1567.002 Exfiltration to Cloud Storage (ใช้ Rclone / WinSCP)",
              redTeam: "ทดสอบอัปโหลดไฟล์จำลองผ่าน API ของบริการ Cloud",
              blueTeam: "บล็อกเว็บไซต์รับฝากไฟล์, ใช้ CASB อนุญาตเฉพาะ Tenant ขององค์กร และตรวจจับไบนารีของ Rclone (แม้ถูกเปลี่ยนชื่อไฟล์)",
              dataSources: ["Network Traffic Content", "Network Traffic Flow", "Process Creation"],
              mitigations: ["M1021 Restrict Web-Based Content", "M1057 Data Loss Prevention"],
              subtechniques: ["T1567.001 Exfiltration to Code Repository", "T1567.002 Exfiltration to Cloud Storage"]
            },
            {
              id: "T1041", code: "T1041", title: "Exfiltration Over C2 Channel",
              subtitle: "ส่งข้อมูลออกผ่านช่องทาง Command and Control เดียวกับที่ใช้สั่งงาน",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1041/",
              why: "ลดความเสี่ยงในการเปิดการเชื่อมต่อใหม่ที่อาจถูก Firewall หรือทีม SOC สังเกตเห็น",
              how: "ทยอยแบ่งข้อมูลเป็นชิ้นเล็กๆ ส่งกลับไปพร้อมกับทราฟฟิก C2",
              redTeam: "ตั้งค่าจำกัดขนาดและอัตราการส่งข้อมูลใน C2 Agent เพื่อไม่ให้กราฟแบนด์วิดท์พุ่งผิดปกติ",
              blueTeam: "ตรวจสอบอัตราส่วนข้อมูลขาออกต่อขาเข้า (Producer-Consumer Ratio) ของเซสชัน HTTPS ที่ติดต่อกับปลายทางเดิมนานๆ",
              dataSources: ["Network Traffic Flow", "Network Traffic Content"],
              mitigations: ["M1031 Network Intrusion Prevention", "M1057 Data Loss Prevention"],
              subtechniques: ["Chunked Encrypted C2 Data Transfer"]
            }
          ]
        },
        {
          id: "TA0040", code: "TA0040", title: "15. Impact (15 Techniques)",
          subtitle: "การสร้างความเสียหาย ทำลายข้อมูล เข้ารหัสเรียกค่าไถ่ หรือหยุดชะงักบริการ",
          domain: "enterprise", nodeType: "tactic", url: "https://attack.mitre.org/tactics/TA0040/",
          why: "เป็นขั้นตอนสุดท้ายของผู้โจมตีที่ต้องการเรียกค่าไถ่ (Ransomware), ทำลายหลักฐาน หรือขัดขวางการดำเนินธุรกิจ",
          how: "ลบสำเนาข้อมูลสำรอง (Shadow Copies), เข้ารหัสไฟล์ทั่วเครือข่าย, ลบข้อมูลทิ้ง (Wiper) หรือโจมตีให้ระบบล่ม",
          redTeam: "จำลองพฤติกรรมการเรียกคำสั่งลบ Shadow Copy หรือทดสอบการเขียนไฟล์จำลองเพื่อวัดความเร็วการบล็อกของ EDR",
          blueTeam: "จัดทำ Immutable / Offline Backups (กฎ 3-2-1-1-0), ตั้งค่า EDR บล็อกการรัน `vssadmin delete shadows` อัตโนมัติ และจำกัดสิทธิ์การเข้าถึงระบบ Backup แยกจาก Active Directory หลัก",
          dataSources: ["Process Creation", "Command Execution", "File Modification", "Service Metadata"],
          mitigations: ["M1053 Data Backup (Immutable/Offline)", "M1040 Behavior Prevention on Endpoint", "M1030 Network Segmentation"],
          children: [
            {
              id: "T1486", code: "T1486", title: "Data Encrypted for Impact (Ransomware)",
              subtitle: "เข้ารหัสไฟล์ในเครื่อง เซิร์ฟเวอร์ และ Network Share เพื่อเรียกค่าไถ่",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1486/",
              why: "บีบให้องค์กรจ่ายเงินค่าไถ่เพื่อแลกกับกุญแจถอดรหัสและเพื่อให้ธุรกิจกลับมาดำเนินการต่อได้",
              how: "ใช้อัลกอริทึมผสม (เช่น AES/ChaCha20 + RSA/ECC) เข้ารหัสไฟล์ด้วยความเร็วสูงทั้งบน Windows และ Linux/ESXi",
              redTeam: "ประเมินเส้นทางที่ผู้โจมตีสามารถสั่งรันสคริปต์กระจายไปยังทุกเครื่องพร้อมกัน (เช่น ผ่าน GPO หรือคอนโซลการจัดการ)",
              blueTeam: "เปิดใช้งาน Anti-Ransomware Behavioral Protection บน EDR, แยกเครือข่ายระบบสำรองข้อมูล (Immutable Backup) และตั้งตัวดักจับ Canary Files",
              dataSources: ["File: File Modification", "File: File Creation", "Process: Process Creation"],
              mitigations: ["M1053 Data Backup", "M1040 Behavior Prevention on Endpoint"],
              subtechniques: ["Enterprise Windows Encryption", "VMware ESXi Hypervisor Encryption", "Cloud Storage Bucket Encryption"]
            },
            {
              id: "T1490", code: "T1490", title: "Inhibit System Recovery",
              subtitle: "ลบ Volume Shadow Copies และปิดฟีเจอร์การกู้คืนระบบก่อนเข้ารหัสไฟล์",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1490/",
              why: "ป้องกันไม่ให้ผู้ดูแลระบบกู้คืนไฟล์ที่ถูกเข้ารหัสกลับมาได้ด้วยตนเอง",
              how: "รันคำสั่ง `vssadmin.exe delete shadows /all /quiet`, `wmic shadowcopy delete`, `bcdedit /set {default} recoveryenabled No`",
              redTeam: "ใช้เป็นสัญญาณทดสอบความพร้อมของทีม SOC เพราะเป็นคำสั่งที่มีความแม่นยำในการบ่งชี้แรนซัมแวร์สูงมาก",
              blueTeam: "ตั้งกฎ EDR ให้ Block & Isolate Host ทันทีที่มีการรันคำสั่งลบ Shadow Copy ไม่ว่าด้วยวิธี Command Line หรือ WMI",
              dataSources: ["Command: Command Execution", "Process: Process Creation", "WMI Execution"],
              mitigations: ["M1053 Data Backup", "M1028 Operating System Configuration", "M1038 Execution Prevention"],
              subtechniques: ["VSSAdmin Shadow Copy Deletion", "WMI Shadowcopy Delete", "BCDEdit Boot Recovery Modification"]
            },
            {
              id: "T1485", code: "T1485", title: "Data Destruction (Wiper)",
              subtitle: "เขียนทับหรือลบข้อมูลและระบบไฟล์ทิ้งอย่างถาวรเพื่อทำลายระบบ",
              domain: "enterprise", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1485/",
              why: "มุ่งสร้างความเสียหายสูงสุดให้แก่องค์กรเป้าหมายโดยไม่ได้หวังผลเรียกค่าไถ่ หรือเพื่อทำลายหลักฐานทั้งหมด",
              how: "เขียนทับไฟล์และ Master Boot Record (MBR) หรือลบ Cloud Storage / Virtual Machines ทั้งหมด",
              redTeam: "ประเมินสิทธิ์การลบทรัพยากรสำคัญบน Cloud (เช่น S3 Bucket, RDS, VM Snapshots) ว่ามี MFA Delete หรือไม่",
              blueTeam: "เปิดใช้งาน MFA Delete / Object Lock (WORM) บน Cloud Storage และแยกสิทธิ์ผู้ดูแลระบบ Backup ออกจากระบบหลัก",
              dataSources: ["File Deletion", "Cloud Storage Audit Logs", "Drive Access"],
              mitigations: ["M1053 Data Backup", "M1026 Privileged Account Management"],
              subtechniques: ["T1485.001 Lifecycle-Triggered Deletion", "Disk & Volume Overwrite Wipers"]
            }
          ]
        }
      ]
    },

    // BRANCH 2: MOBILE MATRIX
    {
      id: "DOM-MOB",
      code: "MOBILE",
      title: "2. Mobile Matrix (Android & iOS)",
      subtitle: "Device Access • Network-Based Effects • Spyware & Banking Trojans",
      domain: "mobile",
      nodeType: "domain",
      url: "https://attack.mitre.org/matrices/mobile/",
      why: "สมาร์ตโฟนและแท็บเล็ตของพนักงานเป็นเป้าหมายสำคัญในการขโมยรหัส OTP/MFA, ข้อมูลการสนทนาองค์กร และแอปธนาคาร",
      how: "ครอบคลุม 14 Mobile Tactics ทั้งการโจมตีระดับแอปพลิเคชัน (Malicious App / Sideloading / Accessibility Abuse) และการโจมตีผ่านเครือข่าย",
      redTeam: "ทดสอบความปลอดภัยของแอปมือถือองค์กร (MASVS) และจำลอง Smishing / Malicious APK",
      blueTeam: "ใช้ระบบจัดการอุปกรณ์พกพา (MDM / UEM) ควบคู่กับ Mobile Threat Defense (MTD) และห้ามลงแอปนอก Store",
      dataSources: ["MDM / UEM Telemetry", "Application Vetting", "Mobile Threat Defense (MTD) Logs"],
      mitigations: ["M1012 Enterprise Policy (MDM)", "Application Vetting", "Block Unknown Sources / Jailbreak Detection"],
      children: [
        {
          id: "MOB-INIT", code: "TA0027", title: "Mobile Initial Access & Persistence",
          subtitle: "การหลอกติดตั้งแอปปลอม (Sideloading), Smishing และช่องโหว่ Zero-Click",
          domain: "mobile", nodeType: "tactic", url: "https://attack.mitre.org/matrices/mobile/android/",
          why: "นำโค้ดอันตรายเข้าสู่อุปกรณ์ Android หรือ iOS ของเป้าหมาย",
          how: "ใช้ลิงก์ SMS/แชตหลอกให้ติดตั้งไฟล์ APK นอก Play Store, แอปปลอมใน Store หรือโจมตีผ่านข้อความมัลติมีเดีย",
          redTeam: "ทดสอบการตรวจสอบใบรับรอง (Certificate Pinning) และการป้องกันการแก้ไขแอป (Tamper Detection)",
          blueTeam: "บังคับใช้นโยบาย MDM บล็อกการติดตั้งแอปจากแหล่งที่ไม่รู้จัก (Unknown Sources) และแยก Work Profile",
          dataSources: ["Application Vetting", "MDM Device Compliance"],
          mitigations: ["Enterprise Mobility Management (EMM/MDM)", "User Awareness on Smishing/APK"],
          children: [
            {
              id: "T1474", code: "T1474", title: "Supply Chain / Repackaged Apps",
              subtitle: "ดัดแปลงแอปยอดนิยมเพื่อฝังโทรจันหรือหลอกให้ดาวน์โหลดผ่านเว็บปลอม",
              domain: "mobile", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1474/",
              why: "หลอกให้ผู้ใช้ติดตั้งแอปที่ดูเหมือนแอปใช้งานจริงพร้อมขอสิทธิ์ควบคุมเครื่อง",
              how: "ฝังโค้ดเข้ากับไฟล์ APK และส่งลิงก์ผ่าน SMS/LINE/Telegram",
              redTeam: "ทดสอบกลไกป้องกันการ Repackage และการตรวจจับ Root/Jailbreak ของแอปองค์กร",
              blueTeam: "ใช้ Managed Google Play / Apple Business Manager จำกัดเฉพาะแอปที่องค์กรอนุมัติ",
              dataSources: ["Application Vetting", "MDM Installed App Inventory"],
              mitigations: ["Application Vetting", "MDM App Allowlisting"],
              subtechniques: ["Malicious APK Sideloading", "Trojanized SDK Dependencies"]
            }
          ]
        },
        {
          id: "MOB-CRED", code: "TA0031", title: "Mobile Credential Access & Collection",
          subtitle: "การขอสิทธิ์ Accessibility Service เพื่ออ่านหน้าจอ ดัก OTP และควบคุมเครื่อง",
          domain: "mobile", nodeType: "tactic", url: "https://attack.mitre.org/matrices/mobile/",
          why: "ขโมยรหัสผ่าน แอบอ่านข้อความ OTP/SMS และสั่งโอนเงินหรืออนุมัติ MFA แทนเจ้าของเครื่อง",
          how: "ใช้ Accessibility Service, หน้าต่าง Overlay ซ้อนทับแอปจริง และการดักจับ Notification",
          redTeam: "ตรวจสอบว่าแอปสำคัญป้องกันการทำ Screen Overlay และบล็อกการแคปหน้าจอ (`FLAG_SECURE`) หรือไม่",
          blueTeam: "ใช้ FIDO2 / Passkeys แทน SMS OTP และตั้งค่าแอปสำคัญให้ตรวจสอบการใช้งาน Accessibility Service ที่ไม่น่าเชื่อถือ",
          dataSources: ["Mobile OS Permission Audit", "MTD Behavioral Detection"],
          mitigations: ["Use Phishing-Resistant MFA (FIDO2)", "Restrict Accessibility Services"],
          children: [
            {
              id: "T1453", code: "T1453", title: "Abuse Accessibility Features",
              subtitle: "ใช้สิทธิ์ช่วยเหลือผู้พิการ (Accessibility) บน Android เพื่ออ่านหน้าจอและกดปุ่มอัตโนมัติ",
              domain: "mobile", nodeType: "technique", url: "https://attack.mitre.org/techniques/T1453/",
              why: "เป็นเทคนิคหลักของแอปดูดเงินและ Banking Trojans ในการอ่านรหัส PIN และสั่งทำรายการ",
              how: "หลอกให้ผู้ใช้เปิดสิทธิ์ Accessibility ให้แอปที่ติดตั้งจากภายนอก",
              redTeam: "ทดสอบว่าแอปองค์กรตรวจจับและแจ้งเตือนเมื่อมีบริการ Accessibility ที่ไม่รู้จักทำงานอยู่หรือไม่",
              blueTeam: "ใช้ Android Restricted Settings และนโยบาย MDM บล็อกการเปิด Accessibility ให้แอปนอกรายการ",
              dataSources: ["MDM Compliance Logs", "App Runtime Integrity Checks"],
              mitigations: ["MDM Policy Enforcement", "In-App Accessibility Service Check"],
              subtechniques: ["Screen Scraping & Keylogging", "Automated UI Click Injection"]
            }
          ]
        }
      ]
    },

    // BRANCH 3: ICS / OT MATRIX
    {
      id: "DOM-ICS",
      code: "ICS / OT",
      title: "3. ICS / OT Matrix (ระบบควบคุมอุตสาหกรรม)",
      subtitle: "SCADA • PLC • DCS • HMI • Safety Instrumented Systems (SIS)",
      domain: "ics",
      nodeType: "domain",
      url: "https://attack.mitre.org/matrices/ics/",
      why: "ปกป้องโครงสร้างพื้นฐานสำคัญ เช่น โรงไฟฟ้า ประปา โรงงานการผลิต และระบบขนส่ง ซึ่งผลกระทบอาจก่อให้เกิดอันตรายต่อชีวิตและทรัพย์สินทางกายภาพ",
      how: "ประกอบด้วย 12 ICS Tactics ที่เชื่อมโยงตั้งแต่การข้ามจากเครือข่าย IT เข้าสู่ OT (Purdue Model) ไปจนถึงการแก้ไขลอจิกของ PLC และขัดขวางระบบความปลอดภัย (Inhibit Response Function)",
      redTeam: "ทำ OT Architecture Assessment ตรวจสอบรอยต่อระหว่างเครือข่าย IT และ OT DMZ โดยไม่รบกวนการทำงานของเครื่องจักรจริง",
      blueTeam: "แบ่งโซนเครือข่ายตามมาตรฐาน IEC 62443 / Purdue Model, ใช้ Passive OT Network Monitoring (ตรวจสอบโปรโตคอล Modbus, DNP3, S7comm, OPC UA) และล็อกกุญแจ PLC ในโหมด RUN",
      dataSources: ["OT Passive Network Tap (Modbus/S7/DNP3)", "Engineering Workstation Logs", "Historian Server Logs", "Asset Inventory"],
      mitigations: ["Network Segmentation (IT/OT DMZ & Unidirectional Gateways)", "Physical Keyswitch Lock on PLCs", "Role-Based Access on Engineering Workstations"],
      children: [
        {
          id: "ICS-INHIBIT", code: "TA0107", title: "Inhibit Response Function & Impair Process Control",
          subtitle: "การปิดระบบเตือนภัย แก้ไขโปรแกรม PLC และปลอมแปลงค่าที่แสดงบนหน้าจอ HMI",
          domain: "ics", nodeType: "tactic", url: "https://attack.mitre.org/tactics/ics/",
          why: "ทำให้วิศวกรควบคุมไม่เห็นความผิดปกติของเครื่องจักร และป้องกันไม่ให้ระบบ Safety ตัดการทำงานอัตโนมัติ",
          how: "ส่งคำสั่งผ่านโปรโตคอลอุตสาหกรรมที่ไม่มีการยืนยันตัวตน หรืออัปโหลด Ladder Logic ที่ดัดแปลงแล้วลงสู่ PLC",
          redTeam: "จำลองการวิเคราะห์ทราฟฟิก OT ในห้องแล็บ (Digital Twin) เพื่อประเมินความเสี่ยงของการส่งคำสั่ง Unauthorized Command Message",
          blueTeam: "เฝ้าระวังคำสั่ง Program Download/Upload ไปยัง PLC และแยกเครือข่าย Safety Instrumented System (SIS) ออกจากเครือข่ายควบคุมปกติอย่างเด็ดขาด",
          dataSources: ["Network Traffic Content (ICS Protocols)", "Controller Configuration Changes", "Alarm Logs"],
          mitigations: ["Safety System Independence", "Controller Authentication & Keyswitch"],
          children: [
            {
              id: "T0836", code: "T0836", title: "Modify Parameter & Unauthorized Command",
              subtitle: "ส่งคำสั่งเปลี่ยนค่าพารามิเตอร์การผลิต (แรงดัน, อุณหภูมิ, วาล์ว) เกินขีดจำกัดความปลอดภัย",
              domain: "ics", nodeType: "technique", url: "https://attack.mitre.org/techniques/T0836/",
              why: "สร้างความเสียหายทางกายภาพต่ออุปกรณ์ในโรงงานหรือทำให้กระบวนการผลิตหยุดชะงัก",
              how: "สั่งงานผ่าน Engineering Workstation ที่ถูกยึด หรือส่งแพ็กเก็ตโปรโตคอล ICS โดยตรง",
              redTeam: "ตรวจสอบการจำกัดสิทธิ์เข้าถึง Engineering Workstation และ Jump Host",
              blueTeam: "ใช้ Deep Packet Inspection สำหรับโปรโตคอล OT เพื่อตรวจจับคำสั่งเปลี่ยนพารามิเตอร์นอกตารางการซ่อมบำรุง",
              dataSources: ["ICS Protocol DPI", "Engineering Workstation Audit Logs"],
              mitigations: ["Network Allowlisting", "Out-of-Band Physical Safety Interlocks"],
              subtechniques: ["PLC Logic Modification", "Spoof Reporting Message to HMI"]
            }
          ]
        }
      ]
    },

    // BRANCH 4: THREAT GROUPS, CAMPAIGNS & MALWARE (CTI)
    {
      id: "DOM-CTI",
      code: "CTI / APT",
      title: "4. Threat Groups, Campaigns & Software",
      subtitle: "APT29 (G0016) • APT28 (G0007) • Lazarus (G0032) • Sandworm (G0034) • Mimikatz (S0002)",
      domain: "cti",
      nodeType: "domain",
      url: "https://attack.mitre.org/groups/",
      why: "ช่วยให้องค์กรไม่ต้องป้องกันแบบหว่านแห แต่สามารถโฟกัสเฉพาะเทคนิคที่กลุ่มแฮกเกอร์และแรนซัมแวร์ใช้โจมตีธุรกิจประเภทเดียวกันจริงๆ",
      how: "เชื่อมโยงรหัสกลุ่มผู้โจมตี (Gxxxx), ซอฟต์แวร์/มัลแวร์ (Sxxxx) และแคมเปญ (Cxxxx) เข้ากับ Techniques บนตาราง ATT&CK",
      redTeam: "ใช้ข้อมูล TTPs ของกลุ่มจริงมาสร้าง Adversary Emulation Plan",
      blueTeam: "นำรายการ Techniques ของกลุ่มที่คุกคามอุตสาหกรรมตนเองมาสร้าง Priority Detection Rules",
      dataSources: ["MITRE ATT&CK CTI STIX/TAXII Repositories", "MISP / OpenCTI Threat Feeds"],
      mitigations: ["Threat-Informed Defense Strategy"],
      children: [
        {
          id: "CTI-APT", code: "GROUPS", title: "State-Sponsored APT Groups & Campaigns",
          subtitle: "กลุ่มผู้โจมตีระดับรัฐที่เน้นการจารกรรมข้อมูลระยะยาวและแทรกซึมโครงสร้างพื้นฐาน",
          domain: "cti", nodeType: "tactic", url: "https://attack.mitre.org/groups/",
          why: "มีความสามารถสูงในการหลบเลี่ยงการตรวจจับ (Defense Evasion), โจมตีระบบ Cloud/Identity และใช้ Living-off-the-Land",
          how: "คลิกเลือกจำลองกลุ่ม APT29 (G0016), APT28 (G0007), Lazarus (G0032) หรือ Sandworm (G0034) ได้ที่แถบด้านบนของแอปเพื่อไฮไลต์เส้นทางโจมตี",
          redTeam: "จำลองการใช้ Valid Accounts, Token Manipulation และ Supply Chain Compromise (C0024)",
          blueTeam: "เน้นตรวจจับพฤติกรรม Identity Compromise และการใช้เครื่องมือระบบผิดรูปแบบ",
          dataSources: ["Identity & Cloud Audit Logs", "EDR Telemetry"],
          mitigations: ["Phishing-Resistant MFA", "Zero Trust Network Architecture"],
          children: [
            {
              id: "NODE-G0016", code: "G0016", title: "APT29 & SolarWinds Campaign (C0024)",
              subtitle: "เน้น Supply Chain, OAuth/SAML Token Forgery และการฝังตัวในระบบ Cloud",
              domain: "cti", nodeType: "technique", url: "https://attack.mitre.org/groups/G0016/",
              why: "เข้าถึงอีเมลและเอกสารระดับสูงโดยไม่ต้องวางมัลแวร์ลงบนเครื่อง Endpoint",
              how: "ใช้ T1195 Supply Chain Compromise, T1078.004 Cloud Accounts, T1098 Account Manipulation",
              redTeam: "ทดสอบความมั่นคงปลอดภัยของ Entra ID / M365 และสิทธิ์ของ Service Principals",
              blueTeam: "ตรวจสอบการสร้าง Service Principal Credentials และการขอสิทธิ์ OAuth ที่เข้าถึง Mail/Files",
              dataSources: ["Cloud Audit Logs", "Identity Provider Sign-in Logs"],
              mitigations: ["Conditional Access", "Privileged Identity Management (PIM)"],
              subtechniques: ["Golden SAML / Federated Identity Abuse", "OAuth App Consent Phishing"]
            }
          ]
        },
        {
          id: "CTI-RANSOM", code: "SOFTWARE", title: "Software, Credential Dumpers & Ransomware",
          subtitle: "Mimikatz (S0002), Action RAT (S1028), C2 Frameworks & Wipers",
          domain: "cti", nodeType: "tactic", url: "https://attack.mitre.org/software/",
          why: "กลุ่มแรนซัมแวร์และอาชญากรรมไซเบอร์มักใช้เครื่องมือชุดเดียวกันซ้ำๆ ก่อนปล่อยตัวเข้ารหัสไฟล์",
          how: "ใช้ Initial Access -> รัน C2 Agent -> ดึงรหัสผ่านด้วย Mimikatz (S0002) -> เคลื่อนย้ายผ่าน RDP/SMB -> ขโมยข้อมูล -> เข้ารหัสไฟล์",
          redTeam: "จำลองห่วงโซ่ Pre-ransomware เพื่อดูว่า SOC สามารถตัดวงจรได้ตั้งแต่ขั้น Credential Access หรือ Lateral Movement หรือไม่",
          blueTeam: "วางกับดักและกฎบล็อกอัตโนมัติในขั้นตอน Pre-ransomware (LSASS access, Shadow copy deletion, Rclone execution)",
          dataSources: ["EDR Process & Memory Telemetry", "Network Flow Logs"],
          mitigations: ["Immutable Backups", "EDR Behavioral Blocking", "MFA Everywhere"],
          children: [
            {
              id: "NODE-S0002", code: "S0002", title: "Mimikatz (S0002) & Credential Theft Ecosystem",
              subtitle: "เครื่องมือดึงรหัสผ่านและตั๋ว Kerberos จากหน่วยความจำ LSASS ที่ใช้แพร่หลายที่สุด",
              domain: "cti", nodeType: "technique", url: "https://attack.mitre.org/software/S0002/",
              why: "ใช้ทำ Pass-the-Hash, Pass-the-Ticket, Golden Ticket และ DCSync เพื่อยึดครอง Active Directory",
              how: "เชื่อมโยงกับ T1003 OS Credential Dumping, T1558 Steal or Forge Kerberos Tickets, T1550 Use Alternate Authentication Material",
              redTeam: "ใช้เทคนิคดัมพ์หน่วยความจำ LSASS หรือเรียกผ่านสคริปต์ในหน่วยความจำ",
              blueTeam: "เปิดใช้งาน Credential Guard / RunAsPPL และเฝ้าระวัง Sysmon Event ID 10 ที่เข้าถึง `lsass.exe`",
              dataSources: ["Process Access (Sysmon ID 10)", "AD Replication Audit Logs (Event 4662)"],
              mitigations: ["M1043 Credential Access Protection", "M1026 Privileged Account Management"],
              subtechniques: ["sekurlsa::logonpasswords", "lsadump::dcsync", "kerberos::golden"]
            }
          ]
        }
      ]
    },

    // BRANCH 5: DEFENSIVE & OPERATIONAL USE CASES
    {
      id: "DOM-DEF",
      code: "DEFENSE",
      title: "5. Operational Use Cases (Blue / Red / Purple)",
      subtitle: "Data Sources • Mitigations (M10xx) • Detection Engineering • ATT&CK Navigator",
      domain: "defense",
      nodeType: "domain",
      url: "https://attack.mitre.org/resources/",
      why: "แปลงกรอบความรู้ MITRE ATT&CK ให้กลายเป็นการลงมือปฏิบัติจริงในการยกระดับความปลอดภัยขององค์กร (Threat-Informed Defense)",
      how: "เชื่อมโยง Techniques เข้ากับ Data Sources (แหล่งข้อมูล Log ที่ต้องเก็บ) และ Mitigations (มาตรการป้องกันเชิงวิศวกรรม)",
      redTeam: "ใช้ทำ Purple Team ร่วมกับฝ่ายป้องกันเพื่อทดสอบประสิทธิภาพของกฎตรวจจับ",
      blueTeam: "ใช้บริหารจัดการ Detection-as-Code (Sigma Rules) และวัดความก้าวหน้าของการป้องกันองค์กร",
      dataSources: ["SIEM / XDR Rule Engine", "MITRE ATT&CK Navigator Layers", "Atomic Red Team / Caldera"],
      mitigations: ["Threat-Informed Defense Maturity Program"],
      children: [
        {
          id: "DEF-DS", code: "DATASOURCES", title: "Detections: Strategies, Analytics & Data Components (v20)",
          subtitle: "การจัดลำดับความสำคัญของ Log ที่ให้ผลลัพธ์การตรวจจับสูงสุด",
          domain: "defense", nodeType: "tactic", url: "https://attack.mitre.org/datasources/",
          why: "องค์กรไม่สามารถเก็บทุก Log ได้อย่างไม่จำกัด จึงต้องเลือกเก็บ Data Sources ที่ครอบคลุม Techniques ได้มากที่สุด",
          how: "5 แหล่งข้อมูลหลักที่ครอบคลุมกว่า 70% ของ Enterprise Techniques ได้แก่ Process Creation, Command Execution, Network Traffic, Authentication Logs และ File/Registry Monitoring",
          redTeam: "ช่วยตรวจสอบว่าเมื่อรันคำสั่งแล้ว ข้อมูลไปปรากฏอยู่ในฟิลด์ใดของ Log",
          blueTeam: "ติดตั้ง Sysmon หรือ EDR และเขียน Sigma Rules ที่แมปกับแท็ก `attack.t1xxx`",
          dataSources: ["DS0009 Process", "DS0017 Command", "DS0029 Network Traffic", "DS0028 Logon Session"],
          mitigations: ["Centralized Log Management", "Detection-as-Code Pipeline"],
          children: [
            {
              id: "NODE-SIGMA", code: "DETECTION", title: "Top 5 High-Value Telemetry & Sigma Mapping",
              subtitle: "Sysmon ID 1/3/8/10/11/13/22 • Windows 4624/4625/4688/4698/4104",
              domain: "defense", nodeType: "technique", url: "https://attack.mitre.org/datasources/",
              why: "ช่วยให้ทีม SOC ตรวจจับพฤติกรรมผิดปกติได้ตั้งแต่ระยะเริ่มต้นก่อนเกิดความเสียหาย",
              how: "เปิด Command-line Auditing ใน Event 4688 และ PowerShell Script Block 4104 เป็นมาตรฐานขั้นต่ำ",
              redTeam: "ใช้ทดสอบว่ากฎตรวจจับพึ่งพาแค่ชื่อไฟล์หรือไม่ (เช่น เปลี่ยนชื่อ `mimikatz.exe` เป็น `notepad.exe`)",
              blueTeam: "เขียนกฎตรวจจับจาก OriginalFileName, พฤติกรรมการเข้าถึงหน่วยความจำ และโครงสร้างพารามิเตอร์",
              dataSources: ["Process Creation with Command Line", "Script Block Logging"],
              mitigations: ["M1047 Audit"],
              subtechniques: ["Windows Security & Sysmon Baseline", "Linux Auditd Rules", "CloudTrail & Entra ID Diagnostic Logs"]
            }
          ]
        },
        {
          id: "DEF-MIT", code: "MITIGATIONS", title: "Enterprise Mitigations (M10xx) & ATT&CK Navigator",
          subtitle: "มาตรการลดความเสี่ยงเชิงสถาปัตยกรรมและการซ้อมรบร่วม Red + Blue",
          domain: "defense", nodeType: "tactic", url: "https://attack.mitre.org/mitigations/enterprise/",
          why: "การตรวจจับอย่างเดียวไม่พอ ต้องมีการป้องกันเชิงรุกที่ทำให้เทคนิคของผู้โจมตีทำงานไม่สำเร็จตั้งแต่แรก",
          how: "ใช้มาตรการหลักของ MITRE เช่น M1032 MFA, M1026 Privileged Account Management, M1030 Network Segmentation, M1043 Credential Access Protection และ M1053 Data Backup",
          redTeam: "ยืนยันว่ามาตรการ Hardening ที่ตั้งไว้ไม่สามารถถูกข้ามได้โดยง่าย",
          blueTeam: "จัดทำแผนงานปรับปรุงความปลอดภัย (Security Roadmap) โดยอ้างอิงรหัส M10xx",
          dataSources: ["Configuration Management Database", "Purple Team Exercise Scorecards"],
          mitigations: ["M1032 MFA", "M1026 PAM", "M1030 Segmentation", "M1053 Immutable Backup"],
          children: [
            {
              id: "NODE-NAV", code: "NAVIGATOR", title: "ATT&CK Navigator & Coverage Scoring",
              subtitle: "การสร้างแผนที่ความร้อน (Heatmap) เพื่อวัดผลความครอบคลุมของการตรวจจับและป้องกัน",
              domain: "defense", nodeType: "technique", url: "https://mitre-attack.github.io/attack-navigator/",
              why: "ช่วยให้เห็นภาพรวมจุดบอด (Blind Spots) ขององค์กรบนตาราง MITRE ATT&CK ได้อย่างชัดเจน",
              how: "กดปุ่ม 'Export โค้ด / JSON' มุมขวาบนของแอปนี้ เพื่อดาวน์โหลดไฟล์ JSON Layer ไปเปิดใน MITRE ATT&CK Navigator ได้ทันที",
              redTeam: "ส่งออก Layer ของเทคนิคที่ทดสอบผ่าน/ไม่ผ่าน",
              blueTeam: "รวม Layer ของภัยคุกคาม (APT Layer) เข้ากับ Layer ของกฎตรวจจับ (SOC Layer) เพื่อหาช่องว่างที่ต้องเร่งแก้ไข",
              dataSources: ["ATT&CK Navigator JSON Layers"],
              mitigations: ["Continuous Purple Team Validation"],
              subtechniques: ["Threat Overlay Comparison", "Detection Maturity Scoring"]
            }
          ]
        }
      ]
    }
  ]
};

// Deep-dive knowledge base for selected sub-techniques (Txxxx.xxx). app.js fills in the rest from MITRE_FULL_DB.
const SUBTECHNIQUE_KB = {
  "T1598.001": {
    subtitle: "หลอกถามข้อมูลผ่านโซเชียลมีเดีย แชตองค์กร หรือแพลตฟอร์มรับสมัครงาน (LinkedIn, Teams, Slack, Telegram)",
    why: "ผู้โจมตีใช้บริการแชตหรือโซเชียลมีเดียแทนอีเมลปกติ เพราะมักไม่ถูกตรวจสอบโดย Email Security Gateway ขององค์กร",
    how: "สร้างโปรไฟล์ปลอมเป็น Recruiter, พนักงานฝ่าย IT Support หรือพาร์ตเนอร์ แล้วส่งข้อความ Direct Message เพื่อหลอกถามข้อมูลโครงสร้างระบบ รหัสผ่าน หรือส่งลิงก์ดักข้อมูล",
    redTeam: "จำลองการติดต่อผ่านแพลตฟอร์มโซเชียลมีเดียหรือ Microsoft Teams External Chat เพื่อทดสอบความตระหนักรู้ของพนักงานนอกเหนือจากช่องทางอีเมล",
    blueTeam: "จำกัดการรับข้อความจากองค์กรภายนอก (External Tenant Federation) บน Microsoft Teams/Slack และอบรมพนักงานให้ระวังการติดต่อเรื่องงานผ่านบัญชีโซเชียลส่วนตัว",
    dataSources: ["Application Log: SaaS Chat & Collaboration Logs", "Network Traffic Content"],
    mitigations: ["M1054 Software Configuration (Restrict External Chat)", "M1017 User Training"]
  },
  "T1598.002": {
    subtitle: "ส่งไฟล์แนบในอีเมลหรือข้อความเพื่อหลอกเก็บข้อมูลความลับหรือรหัสผ่านจากเหยื่อ",
    why: "ใช้ไฟล์แนบ (เช่น ฟอร์ม PDF, HTML หรือเอกสารที่มีลิงก์/แบบฟอร์มข้างใน) เพื่อหลบเลี่ยงตัวกรอง URL ในเนื้อหาอีเมล",
    how: "แนบไฟล์เอกสารแบบสอบถามปลอม หรือไฟล์ HTML ที่เปิดขึ้นมาเป็นหน้าล็อกอิน Microsoft 365 / VPN เพื่อให้เหยื่อกรอกรหัสผ่านส่งกลับไปยังเซิร์ฟเวอร์ผู้โจมตี",
    redTeam: "สร้างไฟล์แนบ HTML/PDF ที่มีฟอร์มล็อกอินจำลองเพื่อวัดผลว่า Email Gateway ตรวจจับไฟล์แนบที่ดึงข้อมูลได้หรือไม่",
    blueTeam: "บล็อกไฟล์แนบประเภท `.html`, `.htm`, `.hta` ที่มาจากภายนอก และใช้ระบบวิเคราะห์เนื้อหาไฟล์แนบ (Content Disarm & Reconstruction)",
    dataSources: ["Application Log: Email Gateway Attachment Logs", "File Creation"],
    mitigations: ["M1021 Restrict Web-Based Content", "M1017 User Training"]
  },
  "T1598.003": {
    subtitle: "ส่งลิงก์เว็บไซต์ปลอม (Credential Harvesting / AiTM Proxy) เพื่อดักจับรหัสผ่านและ Session Token",
    why: "เป็นวิธีที่แพร่หลายที่สุดในการขโมยรหัสผ่านและคุกกี้ MFA แบบ Real-time โดยใช้โดเมนที่คล้ายของจริง",
    how: "ส่งอีเมลแจ้งเตือนความปลอดภัยหรือเอกสารแชร์ปลอมที่มีลิงก์ไปยัง Reverse Proxy (เช่น Evilginx2/Modlishka) เพื่อดักทั้งรหัสผ่านและ Session Cookie หลังผ่าน MFA",
    redTeam: "ตั้งค่า AiTM Phishing Page จำลองและส่งลิงก์ทดสอบเพื่อประเมินว่าองค์กรใช้ FIDO2/Passkey หรือ Token Binding หรือไม่",
    blueTeam: "เปลี่ยนไปใช้ Phishing-resistant MFA (FIDO2 / WebAuthn / Passkeys), เปิดใช้ Conditional Access Token Protection และตรวจจับโดเมน Typosquatting",
    dataSources: ["DNS Query Logs", "Proxy / Web Gateway Logs", "Identity Provider Sign-in Logs"],
    mitigations: ["M1032 Multi-factor Authentication (FIDO2)", "M1021 Restrict Web-Based Content", "M1017 User Training"]
  },
  "T1598.004": {
    subtitle: "โทรศัพท์หลอกลวง (Vishing) หรือใช้เสียง AI Deepfake สวมรอยเป็นฝ่าย IT Helpdesk / ผู้บริหาร",
    why: "การคุยด้วยเสียงสร้างความกดดันและความเร่งด่วน ทำให้เหยื่อยอมบอกรหัส OTP หรือกดอนุมัติ MFA Push ได้ง่าย",
    how: "ผู้โจมตีโทรหาพนักงานโดยอ้างว่ามาจากทีม IT Security เพื่อขอให้รีเซ็ตรหัสผ่าน หรือโทรหา IT Helpdesk เพื่อขอให้ปลดล็อก MFA ของบัญชีเป้าหมาย",
    redTeam: "ทำ Vishing Simulation โทรทดสอบกระบวนการยืนยันตัวตนของแผนก IT Helpdesk ก่อนรีเซ็ต MFA",
    blueTeam: "กำหนดขั้นตอนการยืนยันตัวตนแบบเห็นหน้า (Video Verification) หรือการอนุมัติจากหัวหน้างานก่อนที่ Helpdesk จะรีเซ็ต MFA ทุกครั้ง",
    dataSources: ["Helpdesk Ticket & Call Logs", "Identity Provider MFA Reset Audit Logs"],
    mitigations: ["M1017 User Training", "Strict Helpdesk Identity Verification Protocol"]
  },
  "T1595.001": {
    subtitle: "กวาดสแกนช่วง IP Address (IP Blocks) ขององค์กรเป้าหมายเพื่อค้นหาโฮสต์และพอร์ตที่เปิดอยู่",
    why: "ระบุขนาดเครือข่ายภายนอกของเป้าหมายและค้นหาเซิร์ฟเวอร์ที่ถูกเปิดลืมไว้บนอินเทอร์เน็ต (Shadow IT)",
    how: "ใช้ TCP SYN/ACK scan, ICMP ping sweep หรือ UDP scan ไล่ตรวจตาม CIDR block ที่จดทะเบียนในชื่อองค์กร",
    redTeam: "รัน `masscan` หรือ `nmap -sS -Pn` บนช่วง ASN/IP ของเป้าหมายเพื่อสร้างแผนผังพอร์ตที่เปิดบริการ",
    blueTeam: "ปิดพอร์ตที่ไม่จำเป็นบน Firewall ขอบข่าย และใช้ Threat Intelligence บล็อก IP ที่มีพฤติกรรม Port Sweep",
    dataSources: ["Network Traffic Flow (NetFlow / Firewall Deny Logs)"],
    mitigations: ["M1056 Pre-compromise", "External Attack Surface Management (EASM)"]
  },
  "T1595.002": {
    subtitle: "สแกนหาช่องโหว่ซอฟต์แวร์ (Vulnerability Scanning) บนเว็บและอุปกรณ์ที่เชื่อมต่ออินเทอร์เน็ต",
    why: "ค้นหาหมายเลขเวอร์ชันซอฟต์แวร์และตรวจสอบว่ามีช่องโหว่ CVE ที่สามารถใช้เจาะระบบในขั้น Initial Access ได้หรือไม่",
    how: "ใช้เครื่องมือสแกนอัตโนมัติ (Nuclei, Nessus, Nikto) ส่งแพ็กเก็ตตรวจสอบ Banner และทดสอบช่องโหว่ที่รู้จัก",
    redTeam: "รัน Nuclei templates เฉพาะทางเพื่อค้นหาช่องโหว่ RCE หรือ Misconfiguration บนระบบ External",
    blueTeam: "ตั้งค่า WAF/IPS บล็อกทราฟฟิกจากเครื่องมือสแกนช่องโหว่ และซ่อนเลขเวอร์ชันใน HTTP Server Headers",
    dataSources: ["Web Server Access Logs", "WAF / IDS Alert Logs"],
    mitigations: ["M1051 Update Software", "WAF Rate Limiting & Bot Protection"]
  },
  "T1595.003": {
    subtitle: "สุ่มเดาชื่อโฟลเดอร์ ไฟล์ลับ ซับโดเมน หรือ API Endpoint ด้วยพจนานุกรมคำศัพท์ (Wordlist Scanning)",
    why: "ค้นหาหน้า Admin, ไฟล์ `.env`, ไฟล์ Backup (`.bak`, `.zip`) หรือ API ที่ไม่ได้แสดงอยู่ในหน้าเว็บปกติ",
    how: "ใช้เครื่องมืออย่าง `ffuf`, `gobuster`, `feroxbuster` หรือ `amass` ยิงคำขอตามรายการ Wordlist และสังเกต HTTP Status Code (200, 301, 403)",
    redTeam: "สแกนหา `/api/v1/swagger`, `/.git/config`, `/backup.zip` และซับโดเมนระบบพัฒนา (`dev.`, `staging.`)",
    blueTeam: "ตรวจจับ IP ที่เรียก URL ที่ทำให้เกิด HTTP 404 จำนวนมากผิดปกติในเวลาสั้นๆ และลบไฟล์สำรองออกจาก Web Root",
    dataSources: ["Web Application Firewall (WAF) Logs", "HTTP Access Logs (High 404 Rate)"],
    mitigations: ["Remove Sensitive Files from Web Root", "WAF Threshold Blocking on 404 Bursts"]
  },
  "T1566.001": {
    subtitle: "ส่งอีเมลพร้อมไฟล์แนบอันตราย (เช่น .ISO, .LNK, .ZIP, เอกสารฝัง Macro หรือ PDF ล่อคลิก)",
    why: "นำโค้ดมัลแวร์เข้าไปรันบนเครื่องเหยื่อโดยตรงเมื่อเหยื่อเปิดไฟล์แนบ",
    how: "ใช้ไฟล์ Container (`.iso`, `.vhd`, `.zip`) ซ่อนไฟล์ `.lnk` และ `.dll` เพื่อหลบ Mark-of-the-Web และสั่งรันโค้ดผ่าน `rundll32.exe`",
    redTeam: "ทดสอบส่งไฟล์แนบจำลองเพื่อวัดประสิทธิภาพของ Email Sandbox และกฎ Attack Surface Reduction (ASR)",
    blueTeam: "บล็อกไฟล์แนบ `.iso`, `.vhd`, `.lnk`, `.hta` ที่เกตเวย์อีเมล และเปิดใช้ ASR Rules บล็อก Office ไม่ให้สร้างโปรเซสลูก",
    dataSources: ["Email Gateway Logs", "Sysmon ID 1 (Process Creation)", "Sysmon ID 11 (FileCreate)"],
    mitigations: ["M1049 Antivirus/Antimalware", "M1038 Execution Prevention (ASR Rules)"]
  },
  "T1566.002": {
    subtitle: "ส่งอีเมลพร้อมลิงก์อันตรายที่นำไปสู่การดาวน์โหลดมัลแวร์ (HTML Smuggling / Drive-by Payload)",
    why: "หลีกเลี่ยงการแนบไฟล์อันตรายมากับอีเมลโดยตรง ซึ่งมักถูกสแกนเจอได้ง่ายกว่าลิงก์เว็บ",
    how: "ลิงก์ชี้ไปยังหน้าเว็บที่ใช้เทคนิค HTML Smuggling (ประกอบไฟล์มัลแวร์ขึ้นใหม่ด้วย JavaScript Blob บนเบราว์เซอร์ของเหยื่อ) หรือดาวน์โหลดผ่านบริการ Cloud ที่น่าเชื่อถือ",
    redTeam: "ใช้ลิงก์ OneDrive/SharePoint หรือ HTML Smuggling เพื่อทดสอบการตรวจจับของ Secure Web Gateway",
    blueTeam: "ใช้ URL Rewriting & Time-of-Click Analysis บนระบบอีเมล และบล็อกการดาวน์โหลดไฟล์ Executable/Script จากเว็บภายนอก",
    dataSources: ["Proxy / DNS Logs", "Browser Download Telemetry", "Process Creation"],
    mitigations: ["M1021 Restrict Web-Based Content", "M1017 User Training"]
  },
  "T1059.001": {
    subtitle: "ใช้ Windows PowerShell รันคำสั่ง สคริปต์ หรือโหลดโค้ดอันตรายเข้าสู่หน่วยความจำโดยตรง",
    why: "PowerShell เข้าถึง Windows API, .NET Framework, WMI และ Active Directory ได้อย่างสมบูรณ์โดยไม่ต้องเขียนไฟล์ลงดิสก์",
    how: "รันคำสั่งเช่น `powershell.exe -nop -w hidden -enc <Base64>` หรือใช้ `IEX (New-Object Net.WebClient).DownloadString(...)`",
    redTeam: "ใช้ PowerShell Empire, In-memory Reflective PE Loader หรือรันคำสั่งผ่าน `System.Management.Automation.dll`",
    blueTeam: "เปิดใช้งาน PowerShell Script Block Logging (Event ID 4104), Module Logging (4103), เปิด Constrained Language Mode และเฝ้าระวัง AMSI",
    dataSources: ["Windows PowerShell Event ID 4104 & 4103", "Sysmon ID 1 (Process Creation)", "AMSI Telemetry"],
    mitigations: ["M1045 Code Signing", "M1042 Disable or Remove Feature (Disable PowerShell v2)", "M1038 Execution Prevention"]
  },
  "T1059.003": {
    subtitle: "ใช้ Windows Command Shell (`cmd.exe`) หรือไฟล์ `.bat` / `.cmd` ในการรันชุดคำสั่งโจมตี",
    why: "`cmd.exe` เป็นตัวแปลคำสั่งพื้นฐานของ Windows ที่มัลแวร์ทุกตัวใช้เรียกคำสั่งสำรวจระบบ ย้ายไฟล์ และสั่งรันโปรแกรมอื่น",
    how: "เรียก `cmd.exe /c ...` ต่อจากโปรเซสที่ถูกเจาะ (เช่น Web Server `w3wp.exe` หรือเอกสาร Word) เพื่อรันคำสั่งต่อเนื่อง",
    redTeam: "ใช้ตัวแปรสภาพแวดล้อมและเครื่องหมาย `^` หรือ Double Quotes ในการพรางคำสั่ง (Command Obfuscation) บน `cmd.exe`",
    blueTeam: "ตรวจจับ Parent-Child Process ที่ผิดปกติ (เช่น `winword.exe -> cmd.exe` หรือ `w3wp.exe -> cmd.exe`) ด้วย Event ID 4688 / Sysmon ID 1",
    dataSources: ["Process Creation (Sysmon ID 1 / Windows Event ID 4688 with CommandLine)"],
    mitigations: ["M1038 Execution Prevention"]
  },
  "T1003.001": {
    subtitle: "เข้าถึงหน่วยความจำของโปรเซส `lsass.exe` เพื่อดึงรหัสผ่าน NTLM Hash และตั๋ว Kerberos",
    why: "`lsass.exe` เก็บข้อมูลรับรองของผู้ใช้ทุกคนที่ล็อกอินอยู่ในเครื่อง รวมถึงผู้ดูแลระบบโดเมน",
    how: "ใช้ `Mimikatz (sekurlsa::logonpasswords)`, `procdump.exe -ma lsass.exe` หรือ `rundll32.exe C:\\windows\\System32\\comsvcs.dll, MiniDump`",
    redTeam: "ใช้ Direct Syscalls (Nanodump) หรือสร้าง Snapshot ของโปรเซส LSASS เพื่อหลบการตรวจจับของ EDR",
    blueTeam: "เปิดใช้ LSA Protection (`RunAsPPL`) และ Windows Defender Credential Guard พร้อมตั้งกฎจับ Sysmon Event ID 10 (TargetImage = `lsass.exe`)",
    dataSources: ["Sysmon Event ID 10 (ProcessAccess to lsass.exe)", "Windows Event ID 4656 / 4663"],
    mitigations: ["M1043 Credential Access Protection (Credential Guard / RunAsPPL)", "M1026 Privileged Account Management"]
  },
  "T1003.006": {
    subtitle: "ปลอมตัวเป็น Domain Controller เพื่อสั่งซิงก์รหัสผ่านทั้งหมดในโดเมนผ่านโปรโตคอล MS-DRSR (DCSync)",
    why: "สามารถดึง Password Hash ของทุกบัญชีใน Active Directory (รวมถึง `krbtgt`) ได้จากระยะไกลโดยไม่ต้องล็อกอินเข้าเครื่อง Domain Controller",
    how: "อาศัยสิทธิ์ `DS-Replication-Get-Changes-All` รันคำสั่ง `lsadump::dcsync` ใน Mimikatz หรือ `impacket-secretsdump`",
    redTeam: "เมื่อยึดบัญชีที่มีสิทธิ์เทียบเท่า Domain Admin หรือ Exchange Windows Permissions ได้ จะรัน DCSync เพื่อดึงค่า Hash ของ `krbtgt`",
    blueTeam: "ตรวจจับ Windows Event ID 4662 บน Domain Controller ที่มี Properties `1131f6ad-9c07-11d1-f79f-00c04fc2dcd2` จาก IP ที่ไม่ใช่ Domain Controller จริง",
    dataSources: ["Active Directory Object Access (Event ID 4662)", "Network Traffic (RPC / DRSUAPI)"],
    mitigations: ["M1026 Privileged Account Management (Audit Replication Permissions)"]
  }
};
