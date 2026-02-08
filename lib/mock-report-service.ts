import { listMockDemolishRequests } from "@/lib/mock-demolish-service";
import { listMockTransferRequests } from "@/lib/mock-transfer-service";

export function getMockManagementTrackingRows() {
  const demolish = listMockDemolishRequests().map((x) => ({
    Type: "DEMOLISH",
    RequestNo: x.RequestNo,
    Status: x.Status,
    CurrentApprover: x.CurrentApprover || "-",
    CreatedAt: x.CreatedAt,
    TotalBookValue: x.TotalBookValue,
    ItemCount: x.ItemCount,
    CreatedByName: x.CreatedByName,
  }));

  const transfer = listMockTransferRequests().map((x) => ({
    Type: "TRANSFER",
    RequestNo: x.RequestNo,
    Status: x.Status,
    CurrentApprover: x.Status,
    CreatedAt: x.CreatedAt,
    TotalBookValue: x.TotalBookValue,
    ItemCount: x.ItemCount,
    CreatedByName: x.CreatedByName,
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
