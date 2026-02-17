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
const MAX_DEMOLISH_BV = 20_000_000;

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

function buildApproval(totalBookValue: number, hasExpertStep: boolean): ApprovalState {
  const flowCode = totalBookValue <= 1 ? "DEMOLISH_LE_1" : "DEMOLISH_GT_1";
  const baseSteps =
    flowCode === "DEMOLISH_LE_1"
      ? [
          "Requester Manager",
          "Plant Accounting Manager",
          "Central Accounting Director",
          "Requester Division Director",
        ]
      : [
          "Requester Manager",
          "Plant Accounting Manager",
          "Requester Division Director",
          "Budget Approver",
          "Central Accounting Director",
          "Final Approver by Amount",
        ];
  const steps = hasExpertStep ? ["Expert Review", ...baseSteps] : baseSteps;

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
  const stepOrder = request.Approval?.CurrentStepOrder ?? 0;
  const stepName = request.Approval?.CurrentStepName ?? "SUBMIT";

  const item: ApprovalHistoryItem = {
    ActionId: uid(),
    StepOrder: stepOrder,
    StepName: stepName,
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
  return upsertMockDemolishItem(requestId, {
    assetId,
    note,
  });
}

export function markMockDemolishItemExistingImage(
  requestId: string,
  itemId: string,
  hasExistingImage: boolean,
) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");

  const item = request.Items.find((x) => x.DemolishRequestItemId === itemId);
  if (!item) throw new Error("Demolish item not found");

  item.HasExistingImage = hasExistingImage;
  saveRequests(rows);
}

export function upsertMockDemolishItem(
  requestId: string,
  input: {
    assetId: string;
    assetNo?: string;
    assetName?: string;
    bookValue?: number;
    hasExistingImage?: boolean;
    note?: string;
    requiresExpertReview?: boolean;
    expertName?: string;
  },
) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (request.Status !== "DRAFT") throw new Error("Add item only in DRAFT");

  const assetFromMock = getMockAssetOptions().find((x) => x.AssetId === input.assetId);
  const fallbackAsset =
    input.assetNo && input.assetName
      ? {
          AssetId: input.assetId,
          AssetNo: input.assetNo,
          AssetName: input.assetName,
          BookValue: Number(input.bookValue || 0),
        }
      : null;

  const asset = assetFromMock || fallbackAsset;
  if (!asset) throw new Error("Asset not found");
  if (request.Items.some((x) => x.AssetId === input.assetId)) throw new Error("Asset already added");

  const item: DemolishItem = {
    DemolishRequestItemId: uid(),
    AssetId: asset.AssetId,
    AssetNo: asset.AssetNo,
    AssetName: asset.AssetName,
    BookValueAtRequest: asset.BookValue,
    Note: input.note,
    Images: [],
    HasExistingImage: Boolean(input.hasExistingImage),
    RequiresExpertReview: Boolean(input.requiresExpertReview),
    ExpertName: input.requiresExpertReview ? (input.expertName || "").trim() || undefined : undefined,
  };

  request.Items.push(item);
  request.TotalBookValue = Number(request.Items.reduce((sum, x) => sum + x.BookValueAtRequest, 0).toFixed(2));
  saveRequests(rows);
  return item;
}

export function removeMockDemolishItem(requestId: string, itemId: string) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (request.Status !== "DRAFT") throw new Error("Remove item only in DRAFT");

  request.Items = request.Items.filter((x) => x.DemolishRequestItemId !== itemId);
  request.TotalBookValue = Number(request.Items.reduce((sum, x) => sum + x.BookValueAtRequest, 0).toFixed(2));
  saveRequests(rows);
}

export function addMockDemolishItemImages(
  requestId: string,
  itemId: string,
  fileNames: string[],
) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (request.Status !== "DRAFT") throw new Error("Attach images only in DRAFT");

  const item = request.Items.find((x) => x.DemolishRequestItemId === itemId);
  if (!item) throw new Error("Demolish item not found");

  const incoming = fileNames.map((x) => x.trim()).filter(Boolean);
  if (!incoming.length) return item.Images;

  item.Images = Array.from(new Set([...item.Images, ...incoming]));
  saveRequests(rows);
  return item.Images;
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

export function removeMockDemolishDocument(requestId: string, documentId: string) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (request.Status !== "DRAFT") throw new Error("Remove document only in DRAFT");

  request.Documents = request.Documents.filter((x) => x.DemolishRequestDocumentId !== documentId);
  saveRequests(rows);
}

export function submitMockDemolish(requestId: string) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (request.Status !== "DRAFT") throw new Error("Only DRAFT can be submitted");
  if (!request.Items.length) throw new Error("Please add at least one item");
  if (request.TotalBookValue > MAX_DEMOLISH_BV) {
    throw new Error(`Total BV exceeds limit (${MAX_DEMOLISH_BV.toLocaleString()})`);
  }
  if (request.Items.some((x) => !x.Images.length && !x.HasExistingImage)) {
    throw new Error("Every asset item must have at least 1 image");
  }
  if (request.Items.some((x) => x.RequiresExpertReview && !x.ExpertName)) {
    throw new Error("Please provide expert name for items requiring expert review");
  }
  if (!request.Documents.some((x) => x.DocTypeCode === "APPROVAL_DOC")) {
    throw new Error("APPROVAL_DOC is required");
  }
  if (request.TotalBookValue > 1 && !request.Documents.some((x) => x.DocTypeCode === "BUDGET_DOC")) {
    throw new Error("BUDGET_DOC is required for BV > 1");
  }

  request.Approval = buildApproval(
    request.TotalBookValue,
    request.Items.some((x) => x.RequiresExpertReview),
  );
  request.Status = "SUBMITTED";
  addHistory(request, "COMMENT", request.CreatedByName, "Submitted to approval");
  saveRequests(rows);
}

export function returnMockDemolishToDraft(
  requestId: string,
  actorName: string,
  reason?: string,
) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (!["SUBMITTED", "PENDING", "REJECTED"].includes(request.Status)) {
    throw new Error("Can return to draft only when status is SUBMITTED/PENDING/REJECTED");
  }

  request.Status = "DRAFT";
  request.Approval = undefined;
  addHistory(request, "COMMENT", actorName, reason || "Returned to draft for edit");
  saveRequests(rows);
}

export function deleteMockDemolishDraft(requestId: string) {
  const rows = readRequests();
  const request = rows.find((x) => x.DemolishRequestId === requestId);
  if (!request) throw new Error("Demolish request not found");
  if (request.Status !== "DRAFT") throw new Error("Delete is allowed only in DRAFT");

  saveRequests(rows.filter((x) => x.DemolishRequestId !== requestId));
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
    request.Approval.CurrentStepName = request.Approval.Steps[request.Approval.CurrentStepOrder - 1];
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
