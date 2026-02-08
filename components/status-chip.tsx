type StatusChipProps = {
  status?: string;
};

function resolveClass(status: string) {
  const normalized = status.toUpperCase();
  if (["APPROVED", "RECEIVED", "SUCCESS", "COUNTED", "SYNCED"].includes(normalized)) {
    return "status-chip status-chip--positive";
  }
  if (["REJECTED", "FAIL", "NOT_COUNTED"].includes(normalized)) {
    return "status-chip status-chip--negative";
  }
  if (["PENDING", "SUBMITTED", "SYNC_PENDING", "PROCESSING"].includes(normalized)) {
    return "status-chip status-chip--warning";
  }
  if (normalized === "DRAFT") {
    return "status-chip status-chip--draft";
  }
  return "status-chip status-chip--neutral";
}

export function StatusChip({ status }: StatusChipProps) {
  const label = status || "N/A";
  return <span className={resolveClass(label)}>{label}</span>;
}
