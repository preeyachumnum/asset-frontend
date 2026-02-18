export type RequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "RECEIVED"
  | "SYNC_PENDING"
  | "SYNCED";

export interface PlantAccess {
  PlantId: string;
  PlantCode?: string;
  PlantName?: string;
}

export interface LoginBeginResponse {
  ok: boolean;
  user: {
    UserId: string;
    Email: string;
    DisplayName: string;
    IsActive: boolean;
  } | null;
  plants: PlantAccess[];
}

export interface LoginResponse {
  ok: boolean;
  sessionId: string;
  expiresAt: string;
  user: {
    userId: string;
    email: string;
    displayName: string;
  };
}

export interface SessionPayload {
  sessionId: string;
  expiresAt: string;
  user: {
    userId: string;
    email: string;
    displayName: string;
  };
  selectedPlantId?: string;
}

export interface AssetRow {
  AssetId: string;
  CompanyId?: string;
  CompanyCode?: string;
  CompanyName?: string;
  PlantId?: string;
  PlantCode?: string;
  PlantName?: string;
  CostCenterId?: string;
  CostCenterCode?: string;
  CostCenterName?: string;
  LocationId?: string;
  LocationCode?: string;
  LocationName?: string;
  AssetGroupId?: string;
  AssetStatusId?: string;
  StatusCode?: string;
  StatusName?: string;
  AssetNo: string;
  AssetName: string;
  BookValue: number;
  ReceiveDate?: string | null;
  QrValue?: string | null;
  QrTypeCode?: string | null;
  HasImage?: boolean | number | null;
  IsActive?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface AssetImage {
  AssetImageId?: string;
  DemolishItemImageId?: string;
  StocktakeItemImageId?: string;
  AssetId?: string;
  FileUrl: string;
  IsPrimary?: boolean;
  SortOrder?: number;
  UploadedAt?: string;
}

export interface AssetDetailResponse {
  ok: boolean;
  asset: AssetRow | null;
  images: AssetImage[];
}

export interface PagingMeta {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

export interface PagedRows<T> {
  rows: T[];
  paging: PagingMeta;
}

export type AssetMismatchType =
  | "MISSING_IN_EASSET"
  | "MISSING_IN_SAP"
  | "PLANT_MISMATCH"
  | "COSTCENTER_MISMATCH"
  | "BOOKVALUE_MISMATCH"
  | "ASSETNAME_MISMATCH";

export interface AssetSapMismatchRow {
  AssetNo: string;
  AssetId?: string | null;
  AssetName?: string | null;
  SapAssetName?: string | null;
  AssetBookValue?: number | null;
  SapBookValue?: number | null;
  AssetCompanyCode?: string | null;
  SapCompanyCode?: string | null;
  AssetPlantCode?: string | null;
  SapPlantCode?: string | null;
  AssetCostCenterCode?: string | null;
  SapCostCenterCode?: string | null;
  SapLastSeenAt?: string | null;
  MismatchType: AssetMismatchType | string;
}

export interface DemolishRequestSummary {
  DemolishRequestId: string;
  RequestNo: string;
  Status: RequestStatus;
  TotalBookValue: number;
  CreatedAt: string;
  CreatedByName: string;
  ItemCount: number;
  CurrentApprover?: string;
}

export interface TransferRequestSummary {
  TransferRequestId: string;
  RequestNo: string;
  Status: RequestStatus;
  TotalBookValue: number;
  CreatedAt: string;
  CreatedByName: string;
  ItemCount: number;
  FromCostCenter: string;
  ToCostCenter: string;
  ToOwnerName: string;
  ToOwnerEmail: string;
  ReasonText: string;
  CurrentApprover?: string;
}

export interface StocktakeSummaryRow {
  StatusCode: string;
  StatusName: string;
  ItemCount: number;
}

export interface StocktakeDetailRow {
  AssetId: string;
  AssetNo: string;
  AssetName: string;
  BookValue: number;
  StatusCode: string;
  StatusName: string;
  CountMethod: "QR" | "BARCODE" | "MANUAL" | "EXCEL";
  CountedAt: string;
  CountedByEmail?: string;
  CountedByName: string;
  NoteText?: string;
  ImageCount: number;
}

export interface StocktakeWorkspaceConfig {
  stocktakeYearConfigId: string;
  isOpen: boolean;
  reportGeneratedAt?: string | null;
  closedAt?: string | null;
  closedByUserId?: string | null;
}

export interface StocktakePendingRow {
  AssetNo: string;
  AssetName: string;
  BookValue?: number | null;
  NoteText?: string | null;
  CountedAt?: string | null;
}

export interface StocktakeWorkspaceData {
  stocktakeId: string;
  plantId: string;
  stocktakeYear: number;
  config: StocktakeWorkspaceConfig | null;
  summary: StocktakeSummaryRow[];
  details: StocktakeDetailRow[];
  pendingItems: StocktakePendingRow[];
}

export interface SapSyncQueueRow {
  SapSyncOutboxId: string;
  RefType: "DEMOLISH" | "TRANSFER";
  RefNo: string;
  NotifyEmail?: string;
  Status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAIL";
  CreatedAt: string;
  ProcessedAt?: string;
  ErrorMessage?: string;
}

export interface EmailOutboxRow {
  EmailOutboxId: string;
  RefType: "TRANSFER";
  RefNo: string;
  ToEmail: string;
  Subject: string;
  BodyText: string;
  Status: "PENDING" | "SENT" | "FAIL";
  CreatedAt: string;
  SentAt?: string;
  ErrorMessage?: string;
}

export interface RoleDefinition {
  code: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface ApprovalFlow {
  title: string;
  condition: string;
  steps: string[];
}

export interface AssetView extends AssetRow {
  HasImage: boolean;
  SapExists: boolean;
  SapBookValue: number;
  SapAssetNo?: string;
  AssetGroupName: string;
  Quantity: number;
  LastCountedAt?: string;
  LastCountStatusCode?: string;
}

export type ApprovalActionCode = "APPROVE" | "REJECT" | "COMMENT";

export interface ApprovalHistoryItem {
  ActionId: string;
  StepOrder: number;
  StepName: string;
  ActionCode: ApprovalActionCode;
  ActorName: string;
  ActionAt: string;
  Comment?: string;
}

export interface ApprovalState {
  FlowCode: "DEMOLISH_LE_1" | "DEMOLISH_GT_1" | "TRANSFER";
  Steps: string[];
  CurrentStepOrder: number;
  CurrentStepName: string;
}

export interface DemolishItem {
  DemolishRequestItemId: string;
  AssetId: string;
  AssetNo: string;
  AssetName: string;
  BookValueAtRequest: number;
  Note?: string;
  Images: string[];
  HasExistingImage?: boolean;
  RequiresExpertReview?: boolean;
  ExpertName?: string;
}

export interface DemolishDocument {
  DemolishRequestDocumentId: string;
  DocTypeCode: "APPROVAL_DOC" | "BUDGET_DOC" | "OTHER";
  FileName: string;
  UploadedAt: string;
}

export interface DemolishRequestDetail {
  DemolishRequestId: string;
  RequestNo: string;
  CompanyId: string;
  PlantId: string;
  CreatedByName: string;
  CreatedAt: string;
  Status: RequestStatus;
  TotalBookValue: number;
  Items: DemolishItem[];
  Documents: DemolishDocument[];
  Approval?: ApprovalState;
  ApprovalHistory: ApprovalHistoryItem[];
  ReceivedAt?: string;
  ReceivedBy?: string;
}

export interface TransferItem {
  TransferRequestItemId: string;
  AssetId: string;
  AssetNo: string;
  AssetName: string;
  BookValueAtRequest: number;
}

export interface TransferRequestDetail {
  TransferRequestId: string;
  RequestNo: string;
  CompanyId: string;
  PlantId: string;
  FromCostCenter: string;
  ToCostCenter: string;
  ToLocation: string;
  ToOwnerName: string;
  ToOwnerEmail: string;
  ReasonText: string;
  CreatedByName: string;
  CreatedAt: string;
  Status: RequestStatus;
  TotalBookValue: number;
  Attachments: string[];
  Items: TransferItem[];
  Approval?: ApprovalState;
  ApprovalHistory: ApprovalHistoryItem[];
}

export interface StocktakeYearConfigView {
  StocktakeYearConfigId: string;
  PlantId: string;
  StocktakeYear: number;
  IsOpen: boolean;
  ReportGeneratedAt?: string;
  ClosedAt?: string;
  ClosedBy?: string;
}

export interface StocktakeParticipantView {
  StocktakeParticipantId: string;
  PlantId: string;
  StocktakeYear: number;
  Email: string;
  DisplayName: string;
}

export interface StocktakeMeetingDocView {
  StocktakeMeetingDocId: string;
  PlantId: string;
  StocktakeYear: number;
  FileName: string;
  UploadedAt: string;
}

export interface StocktakeRecordView {
  StocktakeRecordId: string;
  PlantId: string;
  StocktakeYear: number;
  AssetId: string;
  AssetNo: string;
  AssetName: string;
  BookValue: number;
  CostCenterName: string;
  AssetGroupName: string;
  LocationName: string;
  StatusCode: "COUNTED" | "NOT_COUNTED" | "PENDING" | "REJECTED" | "OTHER";
  StatusName: string;
  AccountingStatusCode?: StocktakeAccountingStatusCode;
  AccountingStatusName?: string;
  CountMethod: "QR" | "BARCODE" | "MANUAL" | "EXCEL";
  CountedQty: number;
  CountedAt: string;
  CountedByName: string;
  NoteText?: string;
  Images: string[];
}

export type StocktakeAccountingStatusCode = "SUBMIT" | "APPROVED" | "REJECT";

export interface StocktakeReportFilters {
  PlantId: string;
  StocktakeYear: number;
  CostCenterKeyword?: string;
  AssetGroupKeyword?: string;
  Month?: number;
  DateFrom?: string;
  DateTo?: string;
  StatusCode?: string;
  LocationKeyword?: string;
  SearchKeyword?: string;
}
