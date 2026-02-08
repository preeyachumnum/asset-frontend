"use client";

import { useState } from "react";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { formatDate } from "@/lib/format";
import {
  enqueueMockTransferEmail,
  listMockEmailOutbox,
  markMockEmailSent,
} from "@/lib/mock-email-service";
import {
  listMockSyncQueue,
  markMockSyncResult,
} from "@/lib/mock-sync-service";

export default function SapSyncPageView() {
  const [, setTick] = useState(0);
  const rows = listMockSyncQueue();
  const emailRows = listMockEmailOutbox();

  return (
    <>
      <PageTitle
        title="ซิงค์ SAP อัตโนมัติ"
        subtitle="คิวซิงค์จะถูกสร้างอัตโนมัติ และงานโอนจะส่งอีเมลแจ้งเจ้าหน้าที่ทรัพย์สินหลัง sync สำเร็จ"
      />

      <section className="panel">
        <div className="kpi-grid">
          <div className="kpi">
            <h3>Schedule</h3>
            <p>00:00</p>
          </div>
          <div className="kpi">
            <h3>PENDING</h3>
            <p>{rows.filter((x) => x.Status === "PENDING").length}</p>
          </div>
          <div className="kpi">
            <h3>SUCCESS</h3>
            <p>{rows.filter((x) => x.Status === "SUCCESS").length}</p>
          </div>
          <div className="kpi">
            <h3>FAIL</h3>
            <p>{rows.filter((x) => x.Status === "FAIL").length}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Ref Type</th>
                <th>Ref No</th>
                <th>Status</th>
                <th>Created</th>
                <th>Processed</th>
                <th>Error</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.SapSyncOutboxId}>
                  <td>{row.RefType}</td>
                  <td>{row.RefNo}</td>
                  <td>
                    <StatusChip status={row.Status} />
                  </td>
                  <td>{formatDate(row.CreatedAt)}</td>
                  <td>{formatDate(row.ProcessedAt)}</td>
                  <td>{row.ErrorMessage || "-"}</td>
                  <td>
                    {row.Status === "PENDING" ? (
                      <div className="chip-list">
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => {
                            const updated = markMockSyncResult(row.SapSyncOutboxId, "SUCCESS");
                            if (updated?.RefType === "TRANSFER" && updated.NotifyEmail) {
                              enqueueMockTransferEmail({
                                refNo: updated.RefNo,
                                toEmail: updated.NotifyEmail,
                                subject: `Transfer ${updated.RefNo} synced to SAP`,
                                bodyText:
                                  `Transfer ${updated.RefNo} has completed SAP sync at ${formatDate(updated.ProcessedAt)}.`,
                              });
                            }
                            setTick((x) => x + 1);
                          }}
                        >
                          Mark Success
                        </button>
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => {
                            markMockSyncResult(row.SapSyncOutboxId, "FAIL", "SAP sync error");
                            setTick((x) => x + 1);
                          }}
                        >
                          Mark Fail
                        </button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7}>No sync queue yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">Email Outbox (post-sync notify)</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Ref No</th>
                <th>To</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Created</th>
                <th>Sent</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {emailRows.map((row) => (
                <tr key={row.EmailOutboxId}>
                  <td>{row.RefNo}</td>
                  <td>{row.ToEmail}</td>
                  <td>{row.Subject}</td>
                  <td>
                    <StatusChip status={row.Status} />
                  </td>
                  <td>{formatDate(row.CreatedAt)}</td>
                  <td>{formatDate(row.SentAt)}</td>
                  <td>
                    {row.Status === "PENDING" ? (
                      <button
                        className="button button--ghost"
                        type="button"
                        onClick={() => {
                          markMockEmailSent(row.EmailOutboxId);
                          setTick((x) => x + 1);
                        }}
                      >
                        Mark Sent
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              {!emailRows.length ? (
                <tr>
                  <td colSpan={7}>No email queue yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
