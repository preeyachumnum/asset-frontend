"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { formatDate, formatMoney, truncateId } from "@/lib/format";
import { getMockAssetOptions } from "@/lib/mock-assets-service";
import {
  actionMockDemolishApproval,
  addMockDemolishDocument,
  addMockDemolishItem,
  createMockDemolishDraft,
  demolishStatusOptions,
  getMockDemolishDetail,
  listMockDemolishRequests,
  receiveMockDemolish,
  submitMockDemolish,
} from "@/lib/mock-demolish-service";
import type { DemolishRequestSummary, RequestStatus } from "@/lib/types";

export default function DemolishPageView() {
  const [rows, setRows] = useState<DemolishRequestSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [status, setStatus] = useState<RequestStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [companyId, setCompanyId] = useState("MITRPHOL");
  const [plantId, setPlantId] = useState("Plant-KLS");
  const [createdBy, setCreatedBy] = useState("asset.accounting@mitrphol.com");

  const [assetId, setAssetId] = useState("");
  const [note, setNote] = useState("");
  const [docType, setDocType] = useState<"APPROVAL_DOC" | "BUDGET_DOC" | "OTHER">("APPROVAL_DOC");
  const [docName, setDocName] = useState("");
  const [approvalActor, setApprovalActor] = useState("approver@mitrphol.com");
  const [approvalComment, setApprovalComment] = useState("");

  const refresh = () => {
    setRows(listMockDemolishRequests());
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
        [row.RequestNo, row.CreatedByName, row.CurrentApprover]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return byStatus && bySearch;
    });
  }, [rows, search, status]);

  const selected = selectedId ? getMockDemolishDetail(selectedId) : null;
  const assetOptions = getMockAssetOptions();

  function notify(text: string) {
    setMessage(text);
    refresh();
  }

  function onCreateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = createMockDemolishDraft({
      companyId,
      plantId,
      createdByName: createdBy,
    });
    setSelectedId(request.DemolishRequestId);
    notify(`Created ${request.RequestNo}`);
  }

  return (
    <>
      <PageTitle
        title="การตัดบัญชีทรัพย์สิน"
        subtitle="สร้างคำขอ, แนบรายการและเอกสาร, ส่งอนุมัติ, อนุมัติ/ไม่อนุมัติ, รับเข้าพัสดุ แล้วค่อยเข้า SAP Sync"
      />

      {message ? (
        <section className="panel">
          <p className="muted">{message}</p>
        </section>
      ) : null}

      <section className="panel">
        <h3 className="mb-2.5">1) Create Draft Request</h3>
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
              <label>Created By</label>
              <input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <button className="button button--primary" type="submit">
              Create Draft
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">2) Request List</h3>
        <div className="form-grid">
          <div className="field">
            <label>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="DM-2026-00001" />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as RequestStatus | "ALL")}>
              {demolishStatusOptions().map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-wrap mt-2.5">
          <table className="table">
            <thead>
              <tr>
                <th>Request No</th>
                <th>Status</th>
                <th>Total BV</th>
                <th>Items</th>
                <th>Current Step</th>
                <th>Created</th>
                <th>Select</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.DemolishRequestId}>
                  <td>{row.RequestNo}</td>
                  <td>
                    <StatusChip status={row.Status} />
                  </td>
                  <td>{formatMoney(row.TotalBookValue)}</td>
                  <td>{row.ItemCount}</td>
                  <td>{row.CurrentApprover || "-"}</td>
                  <td>{formatDate(row.CreatedAt)}</td>
                  <td>
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => setSelectedId(row.DemolishRequestId)}
                    >
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
          <h3 className="mb-2.5">
            3) Request Detail: {selected.RequestNo} ({truncateId(selected.DemolishRequestId)})
          </h3>
          <div className="chip-list mb-2.5">
            <span className="chip">Status: {selected.Status}</span>
            <span className="chip">Total BV: {formatMoney(selected.TotalBookValue)}</span>
            <span className="chip">Items: {selected.Items.length}</span>
            <span className="chip">Created by: {selected.CreatedByName}</span>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Add Asset Item</label>
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                <option value="">Select asset</option>
                {assetOptions.map((asset) => (
                  <option key={asset.AssetId} value={asset.AssetId}>
                    {asset.AssetNo} - {asset.AssetName} ({asset.CostCenterName})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Item Note</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="field">
              <label>Attach Document Type</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)}>
                <option value="APPROVAL_DOC">APPROVAL_DOC</option>
                <option value="BUDGET_DOC">BUDGET_DOC</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div className="field">
              <label>Document Name</label>
              <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="doc.pdf" />
            </div>
          </div>

          <div className="chip-list mt-3">
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                try {
                  if (!assetId) throw new Error("Please choose asset");
                  addMockDemolishItem(selected.DemolishRequestId, assetId, note);
                  setNote("");
                  notify("Added item.");
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            >
              Add Item
            </button>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                try {
                  if (!docName.trim()) throw new Error("Please enter document name");
                  addMockDemolishDocument(selected.DemolishRequestId, docType, docName.trim());
                  setDocName("");
                  notify("Attached document.");
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            >
              Attach Document
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={() => {
                try {
                  submitMockDemolish(selected.DemolishRequestId);
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
                  actionMockDemolishApproval(
                    selected.DemolishRequestId,
                    "APPROVE",
                    approvalActor,
                    approvalComment,
                  );
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
                  actionMockDemolishApproval(
                    selected.DemolishRequestId,
                    "REJECT",
                    approvalActor,
                    approvalComment,
                  );
                  notify("Rejected request.");
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            >
              Reject
            </button>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                try {
                  receiveMockDemolish(selected.DemolishRequestId, approvalActor);
                  notify("Marked as supplies received.");
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            >
              Supplies Receive
            </button>
          </div>

          <div className="form-grid mt-3">
            <div className="field">
              <label>Approval Actor</label>
              <input value={approvalActor} onChange={(e) => setApprovalActor(e.target.value)} />
            </div>
            <div className="field">
              <label>Approval Comment</label>
              <input value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} />
            </div>
          </div>

          <div className="table-wrap mt-2.5">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Book Value</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {selected.Items.map((item) => (
                  <tr key={item.DemolishRequestItemId}>
                    <td>
                      {item.AssetNo} - {item.AssetName}
                    </td>
                    <td>{formatMoney(item.BookValueAtRequest)}</td>
                    <td>{item.Note || "-"}</td>
                  </tr>
                ))}
                {!selected.Items.length ? (
                  <tr>
                    <td colSpan={3}>No items.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="table-wrap mt-2.5">
            <table className="table">
              <thead>
                <tr>
                  <th>Doc Type</th>
                  <th>File</th>
                  <th>Uploaded At</th>
                </tr>
              </thead>
              <tbody>
                {selected.Documents.map((doc) => (
                  <tr key={doc.DemolishRequestDocumentId}>
                    <td>{doc.DocTypeCode}</td>
                    <td>{doc.FileName}</td>
                    <td>{formatDate(doc.UploadedAt)}</td>
                  </tr>
                ))}
                {!selected.Documents.length ? (
                  <tr>
                    <td colSpan={3}>No documents.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="table-wrap mt-2.5">
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
