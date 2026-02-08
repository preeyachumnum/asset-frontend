import { getMockAssetOptions } from "@/lib/mock-assets-service";
import { pushMockSyncQueue } from "@/lib/mock-sync-service";
import type {
  ApprovalActionCode,
  ApprovalHistoryItem,
  ApprovalState,
  DemolishDocument,
  DemolishItem,
  DemolishRequestDetail,
  DemolishRequestSummary,
  RequestStatus,
} from "@/lib/types";
import { nowIso, readLocalState, uid, writeLocalState } from "@/lib/mock-utils";

const KEY = "asset_frontend_mock_demolish_v1";

function readRequests() {
  return readLocalState<DemolishRequestDetail[]>(KEY, []);
}

function saveRequests(rows: DemolishRequestDetail[]) {
  writeLocalState(KEY, rows);
}

function nextRequestNo(rows: DemolishRequestDetail[]) {
  const year = new Date().getFullYear();
  const head = `DM-${year}-`;
  const maxNo = rows
    .map((x) => x.RequestNo)
    .filter((x) => x.startsWith(head))
    .map((x) => Number(x.slice(head.length)))
    .filter((x) => !Number.isNaN(x))
    .reduce((m, n) => Math.max(m, n), 0);
  return `${head}${String(maxNo + 1).padStart(5, "0")}`;
}

function buildApproval(totalBookValue: number): ApprovalState {
  const flowCode = totalBookValue <= 1 ? "DEMOLISH_LE_1" : "DEMOLISH_GT_1";
  const steps =
    flowCode === "DEMOLISH_LE_1"
      ? ["Requester", "Asset Owner", "Central Accounting Director", "Final Approver", "Asset Accountant"]
      : [
          "Requester",
          "Factory Accounting Manager",
          "Budget Approver",
          "Central Accounting Director",
          "Final Approver",
          "Asset Accountant",
        ];

  return {
    FlowCode: flowCode,
    Steps: steps,
    CurrentStepOrder: 1,
    CurrentStepName: steps[0],
  };
}

function addHistory(
  request: DemolishRequestDetail,
  actionCode: ApprovalActionCode,
  actorName: string,
  comment?: string,
) {
  const currentStep = request.Approval
    ? request.Approval.CurrentStepOrder
    : 0;
  const currentStepName = request.Approval
    ? request.Approval.CurrentStepName
    : "SUBMIT";

  const item: ApprovalHistoryItem = {
    ActionId: uid(),
    StepOrder: currentStep,
    StepName: currentStepName,
    ActionCode: actionCode,
    ActorName: actorName,
    ActionAt: nowIso(),
    Comment: comment,
  };
  request.ApprovalHistory.push(item);
}

function toSummary(request: DemolishRequestDetail): DemolishRequestSummary {
  const currentApprover =
    request.Status === "RECEIVED"
      ? "Supplies Received"
      : request.Status === "APPROVED"
        ? "Waiting for Supplies Receive"
        : request.Approval?.CurrentStepName || request.Status;

  return {
    DemolishRequestId: request.DemolishRequestId,
    RequestNo: request.RequestNo,
    Status: request.Status,
    TotalBookValue: request.TotalBookValue,
    CreatedAt: request.CreatedAt,
    CreatedByName: request.CreatedByName,
    ItemCount: request.Items.length,
    CurrentApprover: currentApprover,
  };
}

export function listMockDemolishRequests() {
  return readRequests().map(toSummary).sort((a, b) => (a.CreatedAt < b.CreatedAt ? 1 : -1));
}

export function listMockDemolishDetails() {
  return readRequests().sort((a, b) => (a.CreatedAt < b.CreatedAt ? 1 : -1));
}

export function getMockDemolishDetail(requestId: string) {
  return readRequests().find((x) => x.DemolishRequestId === requestId) || null;
}

export function createMockDemolishDraft(input: {
  companyId: string;
  plantId: string;
  createdByName: string;
}) {
  const rows = readRequests();
  const request: DemolishRequestDetail = {
    DemolishRequestId: uid(),
    RequestNo: nextRequestNo(rows),
    CompanyId: input.companyId,
    PlantId: input.plantId,
    CreatedByName: input.createdByName,
    CreatedAt: nowIso(),
    Status: "DRAFT",
    TotalBookValue: 0,
    Items: [],
    Documents: [],
    ApprovalHistory: [],
  };
  rows.unshift(request);
  saveRequests(rows);
  return request;
}

export function addMockDemolishItem(requestId: string, assetId: string, note?: string) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (request.Status !== "DRAFT") throw new Error("Add item only in DRAFT");

  const asset = getMockAssetOptions().find((x) => x.AssetId === assetId);
  if (!asset) throw new Error("Asset not found");
  if (request.Items.some((x) => x.AssetId === assetId)) throw new Error("Asset already added");

  const item: DemolishItem = {
    DemolishRequestItemId: uid(),
    AssetId: asset.AssetId,
    AssetNo: asset.AssetNo,
    AssetName: asset.AssetName,
    BookValueAtRequest: asset.BookValue,
    Note: note,
    Images: [],
  };
  request.Items.push(item);
  request.TotalBookValue = Number(
    request.Items.reduce((sum, x) => sum + x.BookValueAtRequest, 0).toFixed(2),
  );
  saveRequests(rows);
  return item;
}

export function addMockDemolishDocument(
  requestId: string,
  docType: DemolishDocument["DocTypeCode"],
  fileName: string,
) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (request.Status !== "DRAFT") throw new Error("Attach document only in DRAFT");

  request.Documents.push({
    DemolishRequestDocumentId: uid(),
    DocTypeCode: docType,
    FileName: fileName,
    UploadedAt: nowIso(),
  });
  saveRequests(rows);
}

export function submitMockDemolish(requestId: string) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (request.Status !== "DRAFT") throw new Error("Only DRAFT can be submitted");
  if (!request.Items.length) throw new Error("Please add at least one item");
  if (!request.Documents.some((x) => x.DocTypeCode === "APPROVAL_DOC")) {
    throw new Error("APPROVAL_DOC is required");
  }
  if (request.TotalBookValue > 1 && !request.Documents.some((x) => x.DocTypeCode === "BUDGET_DOC")) {
    throw new Error("BUDGET_DOC is required for BV > 1");
  }

  request.Approval = buildApproval(request.TotalBookValue);
  request.Status = "SUBMITTED";
  addHistory(request, "COMMENT", request.CreatedByName, "Submitted to approval");
  saveRequests(rows);
}

export function actionMockDemolishApproval(
  requestId: string,
  action: "APPROVE" | "REJECT",
  actorName: string,
  comment?: string,
) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (!request.Approval) throw new Error("Request is not submitted");
  if (!["SUBMITTED", "PENDING"].includes(request.Status)) throw new Error("Invalid status for approval");

  addHistory(request, action, actorName, comment);

  if (action === "REJECT") {
    request.Status = "REJECTED";
    saveRequests(rows);
    return;
  }

  if (request.Approval.CurrentStepOrder >= request.Approval.Steps.length) {
    request.Status = "APPROVED";
    request.Approval.CurrentStepName = "Approved";
  } else {
    request.Approval.CurrentStepOrder += 1;
    request.Approval.CurrentStepName =
      request.Approval.Steps[request.Approval.CurrentStepOrder - 1];
    request.Status = "PENDING";
  }

  saveRequests(rows);
}

export function receiveMockDemolish(requestId: string, actorName: string) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (request.Status !== "APPROVED") throw new Error("Only APPROVED can receive");

  request.Status = "RECEIVED";
  request.ReceivedAt = nowIso();
  request.ReceivedBy = actorName;
  addHistory(request, "COMMENT", actorName, "Supplies received");
  pushMockSyncQueue("DEMOLISH", request.RequestNo);
  saveRequests(rows);
}

export function demolishStatusOptions(): Array<RequestStatus | "ALL"> {
  return ["ALL", "DRAFT", "SUBMITTED", "PENDING", "APPROVED", "REJECTED", "RECEIVED"];
}
