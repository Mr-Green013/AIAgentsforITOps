# MITRE ATT&CK® Mind Map Studio

เว็บไซต์ static สำหรับสำรวจฐานข้อมูล MITRE ATT&CK v20.0 (Enterprise / Mobile / ICS) แบบโต้ตอบ:
Mind Map, Kill-Chain Matrix, APT Overlay, Role Playbooks และตารางฐานข้อมูล 935 TTPs
พร้อม Export เป็น Mermaid / Markdown / ATT&CK Navigator layer

> เครื่องมือชุมชนอย่างไม่เป็นทางการ — ไม่ได้มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก MITRE.
> ATT&CK® is a registered trademark of The MITRE Corporation.

## โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเว็บ (layout + CSS) |
| `assets/mitre-db.js` | ฐานข้อมูลหลัก `MITRE_FULL_DB`: sub-domains, tactics, techniques, sub-techniques, ICS assets |
| `assets/curated.js` | เนื้อหาที่เขียนเอง: `APT_PROFILES`, `PLAYBOOK_DATA`, `MINDMAP_DATA`, `SUBTECHNIQUE_KB` |
| `assets/app.js` | ลอจิกของแอป (รวมฐานข้อมูลเข้า mind map, render, filter, export) |

อัปเดตฐานข้อมูลได้โดยแก้เฉพาะ `assets/mitre-db.js` — ตัวเลขสถิติในหน้า Database คำนวณจากไฟล์นี้อัตโนมัติ

## รันในเครื่อง

```bash
cd mitre-attack-site
python3 -m http.server 8080
# เปิด http://localhost:8080
```

## Deploy

เป็นไฟล์ static ล้วน ไม่ต้องมี backend — วางบน GitHub Pages, Azure Static Web Apps, Nginx หรือ S3 ได้ทันที

**GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → เลือก branch และโฟลเดอร์ที่มีไฟล์นี้
(GitHub Pages รองรับเฉพาะ `/` หรือ `/docs` — ถ้าใช้วิธีนี้ให้ย้ายโฟลเดอร์ไปที่ `/docs` หรือใช้ GitHub Actions workflow สำหรับ Pages)

## หมายเหตุด้านความปลอดภัย

- หน้าเว็บโหลด Tailwind (play CDN) และ Google Fonts จากภายนอก สำหรับ production ควร build Tailwind เป็น CSS ไฟล์เดียว
  แล้ววาง Content-Security-Policy แบบ `script-src 'self'` เพื่อลด supply-chain risk ของ CDN
- โน้ตและสถานะที่ผู้ใช้บันทึกเก็บใน `localStorage` ของเบราว์เซอร์นั้นเท่านั้น (ไม่ได้ส่งไปที่ใด) และถูก escape ก่อนแสดงผล
- ข้อมูลรวบรวมจาก attack.mitre.org — ตรวจสอบกับเว็บไซต์ทางการก่อนใช้อ้างอิงในงานจริง
