import { getMockAssetOptions, updateMockAssetFields } from "@/lib/mock-assets-service";
import { pushMockSyncQueue } from "@/lib/mock-sync-service";
import type {
  ApprovalActionCode,
  ApprovalHistoryItem,
  ApprovalState,
  RequestStatus,
  TransferItem,
  TransferRequestDetail,
  TransferRequestSummary,
} from "@/lib/types";
import { nowIso, readLocalState, uid, writeLocalState } from "@/lib/mock-utils";

const KEY = "asset_frontend_mock_transfer_v1";

function readRequests() {
  return readLocalState<TransferRequestDetail[]>(KEY, []).map((row) => ({
    ...row,
    ToOwnerName: row.ToOwnerName || "Unknown Receiver",
    ToOwnerEmail: row.ToOwnerEmail || "asset.receiver@mitrphol.com",
  }));
}

function saveRequests(rows: TransferRequestDetail[]) {
  writeLocalState(KEY, rows);
}

function nextRequestNo(rows: TransferRequestDetail[]) {
  const year = new Date().getFullYear();
  const head = `TR-${year}-`;
  const maxNo = rows
    .map((x) => x.RequestNo)
    .filter((x) => x.startsWith(head))
    .map((x) => Number(x.slice(head.length)))
    .filter((x) => !Number.isNaN(x))
    .reduce((m, n) => Math.max(m, n), 0);
  return `${head}${String(maxNo + 1).padStart(5, "0")}`;
}

function buildApproval(): ApprovalState {
  const steps = [
    "Head of Source Department",
    "Manager of Source Department",
    "Head of Destination Department",
    "Manager of Destination Department",
    "Director of Destination Department",
  ];
  return {
    FlowCode: "TRANSFER",
    Steps: steps,
    CurrentStepOrder: 1,
    CurrentStepName: steps[0],
  };
}

function addHistory(
  request: TransferRequestDetail,
  actionCode: ApprovalActionCode,
  actorName: string,
  comment?: string,
) {
  const item: ApprovalHistoryItem = {
    ActionId: uid(),
    StepOrder: request.Approval?.CurrentStepOrder || 0,
    StepName: request.Approval?.CurrentStepName || "SUBMIT",
    ActionCode: actionCode,
    ActorName: actorName,
    ActionAt: nowIso(),
    Comment: comment,
  };
  request.ApprovalHistory.push(item);
}

function toSummary(request: TransferRequestDetail): TransferRequestSummary {
  const currentApprover =
    request.Status === "APPROVED"
      ? "Waiting SAP Sync (00:00)"
      : request.Approval?.CurrentStepName || request.Status;
  return {
    TransferRequestId: request.TransferRequestId,
    RequestNo: request.RequestNo,
    Status: request.Status,
    TotalBookValue: request.TotalBookValue,
    CreatedAt: request.CreatedAt,
    CreatedByName: request.CreatedByName,
    ItemCount: request.Items.length,
    FromCostCenter: request.FromCostCenter,
    ToCostCenter: request.ToCostCenter,
    ToOwnerName: request.ToOwnerName || "-",
    ToOwnerEmail: request.ToOwnerEmail || "-",
    CurrentApprover: currentApprover,
  };
}

export function listMockTransferRequests() {
  return readRequests().map(toSummary).sort((a, b) => (a.CreatedAt < b.CreatedAt ? 1 : -1));
}

export function listMockTransferDetails() {
  return readRequests().sort((a, b) => (a.CreatedAt < b.CreatedAt ? 1 : -1));
}

export function getMockTransferDetail(requestId: string) {
  return readRequests().find((x) => x.TransferRequestId === requestId) || null;
}

export function createMockTransferDraft(input: {
  companyId: string;
  plantId: string;
  fromCostCenter: string;
  toCostCenter: string;
  toLocation: string;
  toOwnerName: string;
  toOwnerEmail: string;
  createdByName: string;
}) {
  const rows = readRequests();
  const request: TransferRequestDetail = {
    TransferRequestId: uid(),
    RequestNo: nextRequestNo(rows),
    CompanyId: input.companyId,
    PlantId: input.plantId,
    FromCostCenter: input.fromCostCenter,
    ToCostCenter: input.toCostCenter,
    ToLocation: input.toLocation,
    ToOwnerName: input.toOwnerName || "Unknown Receiver",
    ToOwnerEmail: input.toOwnerEmail || "asset.receiver@mitrphol.com",
    CreatedByName: input.createdByName,
    CreatedAt: nowIso(),
    Status: "DRAFT",
    TotalBookValue: 0,
    Items: [],
    ApprovalHistory: [],
  };
  rows.unshift(request);
  saveRequests(rows);
  return request;
}

export function addMockTransferItem(requestId: string, assetId: string) {
  const rows = readRequests();
  const request = rows.find((x) => x.TransferRequestId === requestId);
  if (!request) throw new Error("Transfer request not found");
  if (request.Status !== "DRAFT") throw new Error("Add item only in DRAFT");

  const asset = getMockAssetOptions().find((x) => x.AssetId === assetId);
  if (!asset) throw new Error("Asset not found");
  if (request.Items.some((x) => x.AssetId === assetId)) throw new Error("Asset already added");
  if (asset.CostCenterName !== request.FromCostCenter) {
    throw new Error("Asset cost center must match source cost center");
  }

  const item: TransferItem = {
    TransferRequestItemId: uid(),
    AssetId: asset.AssetId,
    AssetNo: asset.AssetNo,
    AssetName: asset.AssetName,
    BookValueAtRequest: asset.BookValue,
  };
  request.Items.push(item);
  request.TotalBookValue = Number(
    request.Items.reduce((sum, x) => sum + x.BookValueAtRequest, 0).toFixed(2),
  );
  saveRequests(rows);
  return item;
}

export function submitMockTransfer(requestId: string) {
  const rows = readRequests();
  const request = rows.find((x) => x.TransferRequestId === requestId);
  if (!request) throw new Error("Transfer request not found");
  if (request.Status !== "DRAFT") throw new Error("Only DRAFT can be submitted");
  if (!request.Items.length) throw new Error("Please add at least one item");

  request.Approval = buildApproval();
  request.Status = "SUBMITTED";
  addHistory(request, "COMMENT", request.CreatedByName, "Submitted to approval");
  saveRequests(rows);
}

export function actionMockTransferApproval(
  requestId: string,
  action: "APPROVE" | "REJECT",
  actorName: string,
  comment?: string,
) {
  const rows = readRequests();
  const request = rows.find((x) => x.TransferRequestId === requestId);
  if (!request) throw new Error("Transfer request not found");
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
    request.Items.forEach((item) => {
      updateMockAssetFields(item.AssetId, {
        CostCenterName: request.ToCostCenter,
        LocationName: request.ToLocation,
      });
    });
    pushMockSyncQueue("TRANSFER", request.RequestNo, {
      notifyEmail: request.ToOwnerEmail || undefined,
    });
  } else {
    request.Approval.CurrentStepOrder += 1;
    request.Approval.CurrentStepName =
      request.Approval.Steps[request.Approval.CurrentStepOrder - 1];
    request.Status = "PENDING";
  }

  saveRequests(rows);
}

export function transferStatusOptions(): Array<RequestStatus | "ALL"> {
  return ["ALL", "DRAFT", "SUBMITTED", "PENDING", "APPROVED", "REJECTED"];
}
