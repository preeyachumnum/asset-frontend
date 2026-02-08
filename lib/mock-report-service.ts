import { listMockDemolishDetails } from "@/lib/mock-demolish-service";
import { listMockTransferDetails } from "@/lib/mock-transfer-service";

function toApproverTrail(steps: string[]) {
  if (!steps.length) return "-";
  return steps.join(" > ");
}

export function getMockManagementTrackingRows() {
  const demolish = listMockDemolishDetails().map((x) => ({
    Type: "DEMOLISH",
    RequestNo: x.RequestNo,
    Status: x.Status,
    CurrentApprover:
      x.Status === "RECEIVED"
        ? "Supplies received"
        : x.Status === "APPROVED"
          ? "Waiting for supplies receive"
          : x.Approval?.CurrentStepName || "-",
    CreatedAt: x.CreatedAt,
    TotalBookValue: x.TotalBookValue,
    ItemCount: x.Items.length,
    CreatedByName: x.CreatedByName,
    Receiver: x.ReceivedBy || "-",
    ApproverTrail: toApproverTrail(x.ApprovalHistory.map((a) => `${a.StepName}:${a.ActionCode}`)),
  }));

  const transfer = listMockTransferDetails().map((x) => ({
    Type: "TRANSFER",
    RequestNo: x.RequestNo,
    Status: x.Status,
    CurrentApprover: x.Approval?.CurrentStepName || x.Status,
    CreatedAt: x.CreatedAt,
    TotalBookValue: x.TotalBookValue,
    ItemCount: x.Items.length,
    CreatedByName: x.CreatedByName,
    Receiver: `${x.ToOwnerName} (${x.ToOwnerEmail})`,
    ApproverTrail: toApproverTrail(x.ApprovalHistory.map((a) => `${a.StepName}:${a.ActionCode}`)),
  }));

  return [...demolish, ...transfer].sort((a, b) => (a.CreatedAt < b.CreatedAt ? 1 : -1));
}

export function rowsToCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
      return `"${text.replace(/\"/g, "\"\"")}"`;
    }
    return text;
  };

  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  });
  return lines.join("\n");
}
