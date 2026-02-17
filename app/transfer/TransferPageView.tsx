"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { UploadFileControl } from "@/components/upload-file-control";
import { formatDate, formatMoney, truncateId } from "@/lib/format";
import { getMockAssetOptions } from "@/lib/mock-assets-service";
import {
  actionMockTransferApproval,
  addMockTransferAttachment,
  addMockTransferItem,
  createMockTransferDraft,
  getMockTransferDetail,
  listMockTransferRequests,
  removeMockTransferAttachment,
  removeMockTransferItem,
  submitMockTransfer,
  transferStatusOptions,
  updateMockTransferDraftMeta,
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
  const [toOwnerName, setToOwnerName] = useState("หัวหน้าแผนกรับโอน");
  const [toOwnerEmail, setToOwnerEmail] = useState("asset.receiver@mitrphol.com");
  const [reasonText, setReasonText] = useState("");
  const [createdBy, setCreatedBy] = useState("asset.owner@mitrphol.com");

  const [assetSearch, setAssetSearch] = useState("");
  const [assetId, setAssetId] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentFileLabel, setAttachmentFileLabel] = useState("ยังไม่ได้เลือกไฟล์");

  const [approvalActor, setApprovalActor] = useState("approver@mitrphol.com");
  const [approvalComment, setApprovalComment] = useState("");

  const refresh = () => setRows(listMockTransferRequests());

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      const byStatus = status === "ALL" || row.Status === status;
      const bySearch =
        !keyword ||
        [row.RequestNo, row.CreatedByName, row.FromCostCenter, row.ToCostCenter, row.ToOwnerName]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return byStatus && bySearch;
    });
  }, [rows, search, status]);

  const selected = selectedId ? getMockTransferDetail(selectedId) : null;
  const allAssets = getMockAssetOptions();
  const allowedAssets = useMemo(() => {
    if (!selected) return [];
    const selectedAssetIds = new Set(selected.Items.map((x) => x.AssetId));
    const keyword = assetSearch.trim().toLowerCase();
    return allAssets.filter((x) => {
      if (x.CostCenterName !== selected.FromCostCenter) return false;
      if (selectedAssetIds.has(x.AssetId)) return false;
      if (!keyword) return true;
      return [x.AssetNo, x.AssetName].join(" ").toLowerCase().includes(keyword);
    });
  }, [allAssets, selected, assetSearch]);

  useEffect(() => {
    if (!selected) return;
    setToCc(selected.ToCostCenter);
    setToLocation(selected.ToLocation);
    setToOwnerName(selected.ToOwnerName);
    setToOwnerEmail(selected.ToOwnerEmail);
    setReasonText(selected.ReasonText || "");
  }, [selected]);

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
      toLocation,
      toOwnerName,
      toOwnerEmail,
      reasonText,
      createdByName: createdBy,
    });
    setSelectedId(request.TransferRequestId);
    notify(`Created ${request.RequestNo}`);
  }

  return (
    <>
      <PageTitle
        title="การจัดการทรัพย์สิน: โอนย้าย"
        subtitle="โอนภายในบริษัทเดียวกัน, รวมหลายรายการในคำขอเดียว, และส่งอนุมัติตาม flow ก่อน Sync SAP"
      />

      {message ? (
        <section className="panel">
          <p className="muted">{message}</p>
        </section>
      ) : null}

      <section className="panel">
        <h3 className="mb-2.5">1) สร้างคำขอโอน</h3>
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
              <label>Receiver Name</label>
              <input value={toOwnerName} onChange={(e) => setToOwnerName(e.target.value)} />
            </div>
            <div className="field">
              <label>Receiver Email</label>
              <input value={toOwnerEmail} onChange={(e) => setToOwnerEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Requester</label>
              <input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
            </div>
          </div>
          <div className="field mt-2.5">
            <label>เหตุผลการโอน</label>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="ระบุเหตุผลการโอนทรัพย์สิน"
            />
          </div>
          <div className="mt-3">
            <button className="button button--primary" type="submit">
              Create Draft
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">2) รายการคำขอโอน</h3>
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
        <div className="table-wrap mt-2.5">
          <table className="table">
            <thead>
              <tr>
                <th>Request No</th>
                <th>Status</th>
                <th>From → To</th>
                <th>Total BV</th>
                <th>Items</th>
                <th>Current Step</th>
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
                  <td>{row.CurrentApprover || "-"}</td>
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
                  <td colSpan={8}>No requests.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <section className="panel">
          <h3 className="mb-2.5">
            3) Workspace: {selected.RequestNo} ({truncateId(selected.TransferRequestId)})
          </h3>

          <div className="kpi-grid">
            <div className="kpi">
              <h3>Status</h3>
              <p>{selected.Status}</p>
            </div>
            <div className="kpi">
              <h3>Source CCA</h3>
              <p>{selected.FromCostCenter}</p>
            </div>
            <div className="kpi">
              <h3>Destination CCA</h3>
              <p>{selected.ToCostCenter}</p>
            </div>
            <div className="kpi">
              <h3>Total BV</h3>
              <p>{formatMoney(selected.TotalBookValue)}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[#d8e6f4] bg-[#f7fbff] p-3">
            <h4 className="mb-2 text-sm font-semibold text-[#355b7f]">ข้อมูลปลายทาง (แก้ไขได้ตอน Draft)</h4>
            <div className="form-grid">
              <div className="field">
                <label>To Cost Center</label>
                <input value={toCc} onChange={(e) => setToCc(e.target.value)} disabled={selected.Status !== "DRAFT"} />
              </div>
              <div className="field">
                <label>To Location</label>
                <input value={toLocation} onChange={(e) => setToLocation(e.target.value)} disabled={selected.Status !== "DRAFT"} />
              </div>
              <div className="field">
                <label>Receiver Name</label>
                <input value={toOwnerName} onChange={(e) => setToOwnerName(e.target.value)} disabled={selected.Status !== "DRAFT"} />
              </div>
              <div className="field">
                <label>Receiver Email</label>
                <input value={toOwnerEmail} onChange={(e) => setToOwnerEmail(e.target.value)} disabled={selected.Status !== "DRAFT"} />
              </div>
            </div>
            <div className="field mt-2.5">
              <label>เหตุผลการโอน</label>
              <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} disabled={selected.Status !== "DRAFT"} />
            </div>
            {selected.Status === "DRAFT" ? (
              <div className="mt-2.5">
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => {
                    try {
                      updateMockTransferDraftMeta(selected.TransferRequestId, {
                        toCostCenter: toCc,
                        toLocation,
                        toOwnerName,
                        toOwnerEmail,
                        reasonText,
                      });
                      notify("Updated draft meta.");
                    } catch (error) {
                      setMessage((error as Error).message);
                    }
                  }}
                >
                  Save Draft Meta
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 rounded-xl border border-[#d8e6f4] bg-[#f7fbff] p-3">
            <h4 className="mb-2 text-sm font-semibold text-[#355b7f]">เพิ่มสินทรัพย์ (จาก Source CCA เดียวกัน)</h4>
            <div className="form-grid">
              <div className="field">
                <label>ค้นหา Asset</label>
                <input
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="ค้นหาจาก Asset No/Name"
                />
              </div>
              <div className="field">
                <label>Asset</label>
                <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                  <option value="">Select asset</option>
                  {allowedAssets.map((asset) => (
                    <option key={asset.AssetId} value={asset.AssetId}>
                      {asset.AssetNo} - {asset.AssetName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2.5">
              <button
                className="button button--ghost"
                type="button"
                onClick={() => {
                  try {
                    if (!assetId) throw new Error("Please choose asset");
                    addMockTransferItem(selected.TransferRequestId, assetId);
                    setAssetId("");
                    notify("Added item.");
                  } catch (error) {
                    setMessage((error as Error).message);
                  }
                }}
              >
                Add Item
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[#d8e6f4] bg-[#f7fbff] p-3">
            <h4 className="mb-2 text-sm font-semibold text-[#355b7f]">แนบไฟล์ประกอบการโอน</h4>
            <div className="form-grid">
              <div className="field">
                <label>Attachment Name</label>
                <input
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="transfer-evidence.jpg"
                  disabled={selected.Status !== "DRAFT"}
                />
              </div>
            </div>
            <div className="mt-2.5">
              <UploadFileControl
                id="transfer-attachment-file"
                label="Upload file"
                fileLabel={attachmentFileLabel}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                buttonText="เลือกไฟล์"
                helperText="ไฟล์นี้ใช้เป็นชื่ออ้างอิงหลักฐานการโอน (mock)"
                onFileChange={(file) => {
                  if (!file) {
                    setAttachmentFileLabel("ยังไม่ได้เลือกไฟล์");
                    return;
                  }
                  setAttachmentFileLabel(file.name);
                  if (!attachmentName.trim()) setAttachmentName(file.name);
                }}
              />
            </div>
            {selected.Status === "DRAFT" ? (
              <div className="mt-2.5">
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => {
                    try {
                      addMockTransferAttachment(selected.TransferRequestId, attachmentName);
                      setAttachmentName("");
                      setAttachmentFileLabel("ยังไม่ได้เลือกไฟล์");
                      notify("Added attachment.");
                    } catch (error) {
                      setMessage((error as Error).message);
                    }
                  }}
                >
                  Add Attachment
                </button>
              </div>
            ) : null}
            <div className="chip-list mt-2.5">
              {selected.Attachments.map((file) => (
                <span key={file} className="chip">
                  {file}
                  {selected.Status === "DRAFT" ? (
                    <button
                      className="ml-2 rounded border border-[#8eb4d8] px-1.5 text-[11px]"
                      type="button"
                      onClick={() => {
                        try {
                          removeMockTransferAttachment(selected.TransferRequestId, file);
                          notify("Removed attachment.");
                        } catch (error) {
                          setMessage((error as Error).message);
                        }
                      }}
                    >
                      x
                    </button>
                  ) : null}
                </span>
              ))}
              {!selected.Attachments.length ? <span className="muted">No attachment.</span> : null}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[#d8e6f4] bg-[#f7fbff] p-3">
            <h4 className="mb-2 text-sm font-semibold text-[#355b7f]">Approval Actions</h4>
            <div className="form-grid">
              <div className="field">
                <label>Actor</label>
                <input value={approvalActor} onChange={(e) => setApprovalActor(e.target.value)} />
              </div>
              <div className="field">
                <label>Comment</label>
                <input value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} />
              </div>
            </div>
            <div className="chip-list mt-3">
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
          </div>

          <div className="table-wrap mt-3">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>BV</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selected.Items.map((item) => (
                  <tr key={item.TransferRequestItemId}>
                    <td>
                      {item.AssetNo} - {item.AssetName}
                    </td>
                    <td>{formatMoney(item.BookValueAtRequest)}</td>
                    <td>
                      {selected.Status === "DRAFT" ? (
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => {
                            try {
                              removeMockTransferItem(selected.TransferRequestId, item.TransferRequestItemId);
                              notify("Removed item.");
                            } catch (error) {
                              setMessage((error as Error).message);
                            }
                          }}
                        >
                          Remove
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
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
