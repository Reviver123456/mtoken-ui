# eGOV Test6 (Next.js + MongoDB + Docker)

## ค่าที่ Fix ไว้ในระบบ
- ConsumerKey = `2907f3d6-19e5-4545-a058-b7077f342bfa`
- ConsumerSecret = `TP0mPcTfAFJ`
- AgentID = `8a816448-0207-45f4-8613-65b0ad80afd0`

> โค้ดอยู่ที่ `lib/egov.js`

---

## วิธีรันด้วย Docker (แนะนำ)

```bash
docker compose up --build
```

เปิดเว็บ:
- `http://localhost:3019/test6?appId=xxxxx&mToken=yyyyy`
- `http://localhost:3019/test6/home?appId=xxxxx` (แสดงข้อมูลจาก DB โดยอ้างอิง appId ล่าสุดของผู้ใช้)

> `mToken` ใช้ได้ครั้งเดียว และอายุประมาณ 2 นาที (ขึ้นกับฝั่ง API)

---

## Flow ที่ทำงาน
1. หน้า `/test6` รับ `appId` และ `mToken` จาก URL
2. Backend `POST /api/test6/bootstrap` จะเรียก
   - Auth validate เพื่อเอา Token
   - Deproc เพื่อดึงข้อมูลส่วนบุคคล
3. ตรวจ DB (MongoDB) ด้วย `citizenId`
   - ถ้าไม่พบ: แสดงชื่อ-นามสกุล + เลขบัตร และปุ่ม “บันทึกข้อมูล”
   - ถ้าพบ: ไปหน้า `/test6/home` ทันที
4. หน้า `/test6/home` ดึงข้อมูลจาก DB มาแสดง และมีปุ่ม “ส่ง Notification”

---

## โครงสร้าง DB (Collection: `users`)
บันทึกข้อมูลหลัก:
- citizenId
- firstName, lastName
- mobile, email
- czpUserId
- notification
- appId (บันทึกไว้เพื่อใช้ส่ง Notification)
- createdAt, updatedAt

---

## Endpoints ภายใน
- `POST /api/test6/bootstrap` `{ appId, mToken }`
- `GET /api/test6/user?citizenId=...`
- `GET /api/test6/user?appId=...` (ดึงจาก lastAppId)
- `GET /api/test6/user/latest`
- `POST /api/test6/user` (insert/update)
- `POST /api/test6/notify` `{ citizenId, appId?, message? }`

---

## หมายเหตุ
- โปรเจกต์นี้ใช้ Next.js App Router และแยก CSS ออกเป็นไฟล์ `.module.css`
- ถ้าต้องการรัน local ไม่ใช้ Docker:

```bash
npm install
npm run dev
```

แล้วเปิด `http://localhost:3019/test6`
