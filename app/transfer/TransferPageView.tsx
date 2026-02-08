"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { formatDate, formatMoney, truncateId } from "@/lib/format";
import { getMockAssetOptions } from "@/lib/mock-assets-service";
import {
  actionMockTransferApproval,
  addMockTransferItem,
  createMockTransferDraft,
  getMockTransferDetail,
  listMockTransferRequests,
  submitMockTransfer,
  transferStatusOptions,
} from "@/lib/mock-transfer-service";
import type { RequestStatus, TransferRequestSummary } from "@/lib/types";

export default function TransferPageView() {
  const [rows, setRows] = useState<TransferRequestSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<RequestStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [companyId, setCompanyId] = useState("MITRPHOL");
  const [plantId, setPlantId] = useState("Plant-KLS");
  const [fromCc, setFromCc] = useState("CCA-4100");
  const [toCc, setToCc] = useState("CCA-4200");
  const [toLocation, setToLocation] = useState("NEW-LOCATION");
  const [createdBy, setCreatedBy] = useState("asset.owner@mitrphol.com");

  const [assetId, setAssetId] = useState("");
  const [approvalActor, setApprovalActor] = useState("approver@mitrphol.com");
  const [approvalComment, setApprovalComment] = useState("");

  const refresh = () => {
    setRows(listMockTransferRequests());
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      const byStatus = status === "ALL" || row.Status === status;
      const bySearch =
        !keyword ||
        [row.RequestNo, row.CreatedByName, row.FromCostCenter, row.ToCostCenter]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return byStatus && bySearch;
    });
  }, [rows, search, status]);

  const selected = selectedId ? getMockTransferDetail(selectedId) : null;
  const assetOptions = getMockAssetOptions();
  const allowedAssets = selected
    ? assetOptions.filter((x) => x.CostCenterName === selected.FromCostCenter)
    : [];

  function notify(text: string) {
    setMessage(text);
    refresh();
  }

  function onCreateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = createMockTransferDraft({
      companyId,
      plantId,
      fromCostCenter: fromCc,
      toCostCenter: toCc,
      toLocation: toLocation,
      createdByName: createdBy,
    });
    setSelectedId(request.TransferRequestId);
    notify(`Created ${request.RequestNo}`);
  }

  return (
    <>
      <PageTitle
        title="Transfer Management (Mock)"
        subtitle="ครบ flow เร่งด่วน: create draft, add multi-item (same source CCA), submit, approve/reject"
      />

      {message ? (
        <section className="panel">
          <p className="muted">{message}</p>
        </section>
      ) : null}

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>1) Create Draft Request</h3>
        <form onSubmit={onCreateDraft}>
          <div className="form-grid">
            <div className="field">
              <label>Company</label>
              <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
            </div>
            <div className="field">
              <label>Plant</label>
              <input value={plantId} onChange={(e) => setPlantId(e.target.value)} />
            </div>
            <div className="field">
              <label>From Cost Center</label>
              <input value={fromCc} onChange={(e) => setFromCc(e.target.value)} />
            </div>
            <div className="field">
              <label>To Cost Center</label>
              <input value={toCc} onChange={(e) => setToCc(e.target.value)} />
            </div>
            <div className="field">
              <label>To Location</label>
              <input value={toLocation} onChange={(e) => setToLocation(e.target.value)} />
            </div>
            <div className="field">
              <label>Created By</label>
              <input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="button button--primary" type="submit">
              Create Draft
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>2) Request List</h3>
        <div className="form-grid">
          <div className="field">
            <label>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="TR-2026-00001" />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as RequestStatus | "ALL")}>
              {transferStatusOptions().map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Request No</th>
                <th>Status</th>
                <th>From → To</th>
                <th>Total BV</th>
                <th>Items</th>
                <th>Created</th>
                <th>Select</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.TransferRequestId}>
                  <td>{row.RequestNo}</td>
                  <td>
                    <StatusChip status={row.Status} />
                  </td>
                  <td>
                    {row.FromCostCenter} → {row.ToCostCenter}
                  </td>
                  <td>{formatMoney(row.TotalBookValue)}</td>
                  <td>{row.ItemCount}</td>
                  <td>{formatDate(row.CreatedAt)}</td>
                  <td>
                    <button className="button button--ghost" type="button" onClick={() => setSelectedId(row.TransferRequestId)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7}>No requests.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <section className="panel">
          <h3 style={{ marginBottom: 10 }}>
            3) Request Detail: {selected.RequestNo} ({truncateId(selected.TransferRequestId)})
          </h3>
          <div className="chip-list" style={{ marginBottom: 10 }}>
            <span className="chip">Status: {selected.Status}</span>
            <span className="chip">From: {selected.FromCostCenter}</span>
            <span className="chip">To: {selected.ToCostCenter}</span>
            <span className="chip">Total BV: {formatMoney(selected.TotalBookValue)}</span>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Add Asset (must match source CCA)</label>
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                <option value="">Select asset</option>
                {allowedAssets.map((asset) => (
                  <option key={asset.AssetId} value={asset.AssetId}>
                    {asset.AssetNo} - {asset.AssetName} ({asset.CostCenterName})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Approval Actor</label>
              <input value={approvalActor} onChange={(e) => setApprovalActor(e.target.value)} />
            </div>
            <div className="field">
              <label>Approval Comment</label>
              <input value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} />
            </div>
          </div>

          <div className="chip-list" style={{ marginTop: 12 }}>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                try {
                  if (!assetId) throw new Error("Please choose asset");
                  addMockTransferItem(selected.TransferRequestId, assetId);
                  notify("Added item.");
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            >
              Add Item
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={() => {
                try {
                  submitMockTransfer(selected.TransferRequestId);
                  notify("Submitted to approval.");
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            >
              Submit To Approval
            </button>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                try {
                  actionMockTransferApproval(selected.TransferRequestId, "APPROVE", approvalActor, approvalComment);
                  notify("Approved current step.");
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            >
              Approve
            </button>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                try {
                  actionMockTransferApproval(selected.TransferRequestId, "REJECT", approvalActor, approvalComment);
                  notify("Rejected request.");
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            >
              Reject
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Book Value</th>
                </tr>
              </thead>
              <tbody>
                {selected.Items.map((item) => (
                  <tr key={item.TransferRequestItemId}>
                    <td>
                      {item.AssetNo} - {item.AssetName}
                    </td>
                    <td>{formatMoney(item.BookValueAtRequest)}</td>
                  </tr>
                ))}
                {!selected.Items.length ? (
                  <tr>
                    <td colSpan={2}>No items.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>When</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {selected.ApprovalHistory.map((history) => (
                  <tr key={history.ActionId}>
                    <td>{history.StepName}</td>
                    <td>{history.ActionCode}</td>
                    <td>{history.ActorName}</td>
                    <td>{formatDate(history.ActionAt)}</td>
                    <td>{history.Comment || "-"}</td>
                  </tr>
                ))}
                {!selected.ApprovalHistory.length ? (
                  <tr>
                    <td colSpan={5}>No approval history yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
