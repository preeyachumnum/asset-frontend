import type { EmailOutboxRow } from "@/lib/types";
import { nowIso, readLocalState, uid, writeLocalState } from "@/lib/mock-utils";

const KEY = "asset_frontend_mock_email_outbox_v1";

function readRows() {
  return readLocalState<EmailOutboxRow[]>(KEY, []);
}

function saveRows(rows: EmailOutboxRow[]) {
  writeLocalState(KEY, rows);
}

export function listMockEmailOutbox() {
  return readRows().sort((a, b) => (a.CreatedAt < b.CreatedAt ? 1 : -1));
}

export function enqueueMockTransferEmail(input: {
  refNo: string;
  toEmail: string;
  subject: string;
  bodyText: string;
}) {
  const rows = readRows();
  rows.unshift({
    EmailOutboxId: uid(),
    RefType: "TRANSFER",
    RefNo: input.refNo,
    ToEmail: input.toEmail,
    Subject: input.subject,
    BodyText: input.bodyText,
    Status: "PENDING",
    CreatedAt: nowIso(),
  });
  saveRows(rows);
}

export function markMockEmailSent(emailOutboxId: string) {
  const rows = readRows();
  const row = rows.find((x) => x.EmailOutboxId === emailOutboxId);
  if (!row) return;
  row.Status = "SENT";
  row.SentAt = nowIso();
  saveRows(rows);
}

