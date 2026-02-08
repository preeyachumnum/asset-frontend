import type { SapSyncQueueRow } from "@/lib/types";
import { nowIso, readLocalState, uid, writeLocalState } from "@/lib/mock-utils";

const KEY = "asset_frontend_mock_sync_v1";

function seedSync(): SapSyncQueueRow[] {
  return [];
}

function readSync() {
  return readLocalState<SapSyncQueueRow[]>(KEY, seedSync());
}

function saveSync(rows: SapSyncQueueRow[]) {
  writeLocalState(KEY, rows);
}

export function listMockSyncQueue() {
  return readSync().sort((a, b) => (a.CreatedAt < b.CreatedAt ? 1 : -1));
}

export function pushMockSyncQueue(
  refType: "DEMOLISH" | "TRANSFER",
  refNo: string,
  options?: { notifyEmail?: string },
) {
  const rows = readSync();
  rows.unshift({
    SapSyncOutboxId: uid(),
    RefType: refType,
    RefNo: refNo,
    NotifyEmail: options?.notifyEmail,
    Status: "PENDING",
    CreatedAt: nowIso(),
  });
  saveSync(rows);
}

export function markMockSyncResult(
  sapSyncOutboxId: string,
  status: "SUCCESS" | "FAIL",
  errorMessage?: string,
) {
  const rows = readSync();
  const row = rows.find((x) => x.SapSyncOutboxId === sapSyncOutboxId);
  if (!row) return null;
  row.Status = status;
  row.ProcessedAt = nowIso();
  row.ErrorMessage = errorMessage;
  saveSync(rows);
  return row;
}
