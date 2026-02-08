# Asset Frontend (Next.js)

Frontend สำหรับระบบ **T-Asset for Accounting** ที่อิง requirement จากไฟล์ `easset for accounting req สรุป.pdf` และ schema/procedure จาก `OverAllDB.sql`

## Scope ที่ทำในรอบนี้

- Dashboard ภาพรวมเมนู/Approval flow/Role/Auto sync
- Authentication + Session (`/auth/begin`, `/auth/login`, `/auth/logout`)
- Asset listings + no-image + detail (`/assets`, `/assets/no-image`, `/assets/:id`)
- หน้าโครงหลักสำหรับ Demolish, Transfer, Stocktake, Reports, Sync, Roles
- ออกแบบ data model ฝั่ง frontend ให้สอดคล้องกับตาราง/Stored Procedure หลัก

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

เปิด `http://localhost:3000`

## Environment

```env
NEXT_PUBLIC_ASSET_API_URL=http://localhost:3001
```

## โครงข้อมูลที่อ้างอิงจาก SQL

- `Assets`, `AssetImages`, `AssetStatuses`
- `DemolishRequests`, `DemolishRequestItems`, `DemolishRequestDocuments`, `DemolishReceipts`
- `TransferRequests`, `TransferRequestItems`
- `Stocktakes`, `StocktakeItems`, `StocktakeYearConfigs`, `StocktakeStatuses`
- `ApprovalRequests`, `ApprovalActions`, `WorkflowConfigs`, `WorkflowSteps`
- `SapSyncOutbox`, `Users`, `Roles`, `UserRoles`, `ApproverDirectory`
