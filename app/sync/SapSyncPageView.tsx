"use client";

import { useState } from "react";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { formatDate } from "@/lib/format";
import {
  listMockSyncQueue,
  markMockSyncResult,
} from "@/lib/mock-sync-service";

export default function SapSyncPageView() {
  const [, setTick] = useState(0);
  const rows = listMockSyncQueue();

  return (
    <>
      <PageTitle
        title="Auto Sync SAP (Mock)"
        subtitle="คิว sync จะถูกสร้างอัตโนมัติเมื่อ Demolish/Transfer อนุมัติครบ"
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
                            markMockSyncResult(row.SapSyncOutboxId, "SUCCESS");
                            setTick((x) => x + 1);
                          }}
                        >
                          Mark Success
                        </button>
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => {
                            markMockSyncResult(row.SapSyncOutboxId, "FAIL", "Mock SAP error");
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
    </>
  );
}
