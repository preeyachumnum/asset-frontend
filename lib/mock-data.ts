import type {
  ApprovalFlow,
  AssetRow,
  DemolishRequestSummary,
  RoleDefinition,
  SapSyncQueueRow,
  StocktakeDetailRow,
  StocktakeSummaryRow,
  TransferRequestSummary,
} from "@/lib/types";

export const assetStatusMaster = [
  "สินทรัพย์ใช้งาน",
  "สินทรัพย์เลิกใช้งาน",
  "สินทรัพย์ชำรุด/เสียหาย",
  "สินทรัพย์สูญหาย",
  "สินทรัพย์โอนย้าย",
  "สินทรัพย์ติดประเด็นตามต่อ",
  "สินทรัพย์ไม่มีรูปภาพ",
  "สินทรัพย์เลิกใช้งาน (ซ้ำจากระบบเดิม)",
  "สินทรัพย์จำนำ",
  "สินทรัพย์ยืมระหว่างโรงงาน",
  "สินทรัพย์ที่มีภาระผูกพัน",
  "สินทรัพย์ Retired",
];

export const stocktakeStatuses = [
  "COUNTED",
  "NOT_COUNTED",
  "PENDING",
  "REJECTED",
  "OTHER",
];

export const mockAssets: AssetRow[] = [
  {
    AssetId: "5d4ad7f1-24a5-4b8f-9ddf-31f73c4c6f11",
    AssetNo: "100-001-2020",
    AssetName: "Boiler Feed Pump #1",
    BookValue: 982000,
    ReceiveDate: "2020-04-21",
    QrTypeCode: "STICKER",
    StatusName: "สินทรัพย์ใช้งาน",
    PlantName: "โรงงานน้ำตาล กาฬสินธุ์",
    CostCenterName: "CCA-4100",
    LocationName: "UTILITY-A1",
  },
  {
    AssetId: "fa4f4a9a-54ca-4d63-b634-59a95bf4d1f1",
    AssetNo: "100-017-2019",
    AssetName: "Condensing Turbine",
    BookValue: 2480000,
    ReceiveDate: "2019-11-02",
    QrTypeCode: "LASER_A5",
    StatusName: "สินทรัพย์ใช้งาน",
    PlantName: "โรงงานน้ำตาล สิงห์บุรี",
    CostCenterName: "CCA-4200",
    LocationName: "POWER-01",
  },
  {
    AssetId: "14a8d7af-8a7f-4026-8ea6-b6ea5a10f31e",
    AssetNo: "200-552-2017",
    AssetName: "Forklift 3T",
    BookValue: 0.75,
    ReceiveDate: "2017-03-14",
    QrTypeCode: "STICKER",
    StatusName: "สินทรัพย์ชำรุด/เสียหาย",
    PlantName: "โรงงานเอทานอล อ่างทอง",
    CostCenterName: "CCA-5100",
    LocationName: "WAREHOUSE",
  },
  {
    AssetId: "5dd364ea-4b0c-4b7e-a8ad-7e0785f6a67d",
    AssetNo: "310-014-2016",
    AssetName: "Laboratory Chiller",
    BookValue: 124500,
    ReceiveDate: "2016-06-30",
    QrTypeCode: "LASER_A4",
    StatusName: "สินทรัพย์ติดประเด็นตามต่อ",
    PlantName: "บริษัทมิตรผลวิจัย",
    CostCenterName: "CCA-6200",
    LocationName: "LAB-RD",
  },
  {
    AssetId: "6b922146-4384-4e61-8daa-0f9d5025f0da",
    AssetNo: "420-002-2015",
    AssetName: "Office Workstation Set",
    BookValue: 15200,
    ReceiveDate: "2015-01-18",
    QrTypeCode: "STICKER",
    StatusName: "สินทรัพย์ไม่มีรูปภาพ",
    PlantName: "สำนักงานใหญ่",
    CostCenterName: "CCA-1000",
    LocationName: "HQ-F3",
  },
];

export const mockAssetsNoImage = mockAssets.filter(
  (x) => x.StatusName === "สินทรัพย์ไม่มีรูปภาพ",
);

export const mockDemolishRequests: DemolishRequestSummary[] = [
  {
    DemolishRequestId: "81239198-1f47-4cce-99c8-e4f7ab774c01",
    RequestNo: "DM-2026-00038",
    Status: "SUBMITTED",
    TotalBookValue: 0.84,
    CreatedAt: "2026-01-20T10:22:00Z",
    CreatedByName: "ผู้ร้องขอ - CCA5100",
    ItemCount: 5,
    CurrentApprover: "ผอ.บัญชีกลาง",
  },
  {
    DemolishRequestId: "71239198-1f47-4cce-99c8-e4f7ab774c11",
    RequestNo: "DM-2026-00052",
    Status: "PENDING",
    TotalBookValue: 320000,
    CreatedAt: "2026-01-31T09:00:00Z",
    CreatedByName: "เจ้าของทรัพย์สิน - CCA4200",
    ItemCount: 2,
    CurrentApprover: "CEO",
  },
  {
    DemolishRequestId: "31239198-1f47-4cce-99c8-e4f7ab774c22",
    RequestNo: "DM-2026-00054",
    Status: "RECEIVED",
    TotalBookValue: 18500,
    CreatedAt: "2026-02-04T14:44:00Z",
    CreatedByName: "นักบัญชีทรัพย์สิน",
    ItemCount: 3,
    CurrentApprover: "พัสดุรับของแล้ว",
  },
];

export const mockTransferRequests: TransferRequestSummary[] = [
  {
    TransferRequestId: "98f14d6f-72c0-4ca7-95aa-ec03b0f98311",
    RequestNo: "TR-2026-00021",
    Status: "SUBMITTED",
    TotalBookValue: 258000,
    CreatedAt: "2026-02-02T08:12:00Z",
    CreatedByName: "หัวหน้าแผนกผู้โอน",
    ItemCount: 4,
    FromCostCenter: "CCA-4100",
    ToCostCenter: "CCA-4200",
  },
  {
    TransferRequestId: "41f2b750-97cb-49fb-a631-c91fff53f891",
    RequestNo: "TR-2026-00022",
    Status: "APPROVED",
    TotalBookValue: 629000,
    CreatedAt: "2026-02-06T07:10:00Z",
    CreatedByName: "นักบัญชีทรัพย์สิน",
    ItemCount: 6,
    FromCostCenter: "CCA-6200",
    ToCostCenter: "CCA-1000",
  },
];

export const mockStocktakeSummary: StocktakeSummaryRow[] = [
  { StatusCode: "COUNTED", StatusName: "ตรวจนับแล้ว", ItemCount: 1520 },
  { StatusCode: "NOT_COUNTED", StatusName: "ยังไม่ตรวจนับ", ItemCount: 114 },
  { StatusCode: "PENDING", StatusName: "ติดประเด็นตามต่อ", ItemCount: 36 },
  { StatusCode: "REJECTED", StatusName: "Reject", ItemCount: 0 },
  { StatusCode: "OTHER", StatusName: "อื่นๆ", ItemCount: 7 },
];

export const mockStocktakeDetails: StocktakeDetailRow[] = [
  {
    AssetId: "5d4ad7f1-24a5-4b8f-9ddf-31f73c4c6f11",
    AssetNo: "100-001-2020",
    AssetName: "Boiler Feed Pump #1",
    BookValue: 982000,
    StatusCode: "COUNTED",
    StatusName: "ตรวจนับแล้ว",
    CountMethod: "QR",
    CountedAt: "2026-02-03T09:20:00Z",
    CountedByName: "ทีมตรวจนับโรงงาน กาฬสินธุ์",
    NoteText: "สภาพปกติ",
    ImageCount: 2,
  },
  {
    AssetId: "14a8d7af-8a7f-4026-8ea6-b6ea5a10f31e",
    AssetNo: "200-552-2017",
    AssetName: "Forklift 3T",
    BookValue: 0.75,
    StatusCode: "PENDING",
    StatusName: "ติดประเด็นตามต่อ",
    CountMethod: "MANUAL",
    CountedAt: "2026-02-05T10:15:00Z",
    CountedByName: "หัวหน้าแผนกบัญชี",
    NoteText: "รอแนบเอกสารส่งซ่อม",
    ImageCount: 3,
  },
];

export const mockSapSyncQueue: SapSyncQueueRow[] = [
  {
    SapSyncOutboxId: "935178b7-15e8-41ce-9152-22e0e8f5c731",
    RefType: "DEMOLISH",
    RefNo: "DM-2026-00054",
    Status: "SUCCESS",
    CreatedAt: "2026-02-07T17:00:00Z",
    ProcessedAt: "2026-02-08T00:01:42Z",
  },
  {
    SapSyncOutboxId: "8f026742-b4f2-4b61-984e-0f3dcf2c6d21",
    RefType: "TRANSFER",
    RefNo: "TR-2026-00022",
    Status: "PENDING",
    CreatedAt: "2026-02-08T08:30:00Z",
  },
];

export const roleDefinitions: RoleDefinition[] = [
  {
    code: "ASSET_ACCOUNTING",
    name: "เจ้าหน้าที่บัญชีทรัพย์สิน",
    description: "จัดการข้อมูลทั้งโรงงาน, ตรวจนับ, ปิดปี, รายงาน",
    permissions: [
      "asset:list",
      "asset:detail",
      "stocktake:scan",
      "stocktake:close-year",
      "report:export",
    ],
  },
  {
    code: "ASSET_OWNER",
    name: "เจ้าของทรัพย์สิน",
    description: "สร้างคำขอตัดบัญชี/โอน และติดตามสถานะอนุมัติ",
    permissions: ["demolish:create", "transfer:create", "request:track"],
  },
  {
    code: "APPROVER",
    name: "ผู้อนุมัติ",
    description: "อนุมัติหรือปฏิเสธตามลำดับอำนาจดำเนินการ",
    permissions: ["approval:view", "approval:action"],
  },
  {
    code: "WAREHOUSE",
    name: "เจ้าหน้าที่พัสดุ",
    description: "รับของจริงหลังอนุมัติขั้นสุดท้ายในงานตัดบัญชี",
    permissions: ["demolish:receive"],
  },
  {
    code: "IT_ADMIN",
    name: "Admin (IT)",
    description: "ตั้งค่าสิทธิ์ผู้ใช้, role, master data และ company/plant",
    permissions: ["admin:user", "admin:role", "admin:master"],
  },
];

export const approvalFlows: ApprovalFlow[] = [
  {
    title: "Demolish: Book Value ≤ 1",
    condition: "ต้องผ่าน ผอ.บัญชีกลาง ก่อนเสมอ",
    steps: [
      "ผู้ร้องขอ",
      "เจ้าของทรัพย์สิน",
      "ผอ.บัญชีกลาง",
      "CEO/ผู้อนุมัติขั้นสุดท้าย",
      "นักบัญชีทรัพย์สิน",
      "พัสดุรับของ",
    ],
  },
  {
    title: "Demolish: Book Value > 1 (งบประมาณ)",
    condition: "รวม BV ทุกรายการในเอกสารเดียวกัน",
    steps: [
      "ผู้ร้องขอ",
      "บัญชีกลางโรงงาน",
      "CEO/ผู้มีอำนาจงบ",
      "นักบัญชีทรัพย์สิน",
      "พัสดุรับของ",
    ],
  },
  {
    title: "Transfer: Intra-company",
    condition: "เฟส 1 เฉพาะในบริษัทเดียวกัน",
    steps: [
      "หัวหน้าแผนกผู้โอน",
      "ผจก.ฝ่ายผู้โอน",
      "หัวหน้าแผนกรับโอน",
      "ผจก.ฝ่ายรับโอน",
      "ผอ.ฝ่ายรับโอน (Final)",
    ],
  },
];
