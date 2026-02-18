"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { UploadFileControl } from "@/components/upload-file-control";
import { ApiError, getAssets } from "@/lib/asset-api";
import { formatDate, formatMoney, truncateId } from "@/lib/format";
import { clearSession, readSession, useHydrated, useSession } from "@/lib/session";
import {
  actionMockDemolishApproval,
  addMockDemolishDocument,
  addMockDemolishItemImages,
  createMockDemolishDraft,
  deleteMockDemolishDraft,
  demolishStatusOptions,
  getMockDemolishDetail,
  listMockDemolishRequests,
  markMockDemolishItemExistingImage,
  receiveMockDemolish,
  removeMockDemolishDocument,
  removeMockDemolishItem,
  returnMockDemolishToDraft,
  submitMockDemolish,
  upsertMockDemolishItem,
} from "@/lib/mock-demolish-service";
import type { DemolishRequestSummary, RequestStatus } from "@/lib/types";

const DEMOLISH_BV_LIMIT = 20_000_000;
const EMPTY_FILE_LABEL = "No file selected";

type AssetOption = {
  AssetId: string;
  AssetNo: string;
  AssetName: string;
  CostCenterName: string;
  BookValue: number;
  HasImage: boolean;
};

function parseCsvText(value: string) {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isReturnableStatus(status: RequestStatus) {
  return ["SUBMITTED", "PENDING", "REJECTED"].includes(status);
}

function normalizeAssetKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseHasImage(value: unknown) {
  if (typeof value === "boolean") return value;
  const n = Number(value);
  if (Number.isFinite(n)) return n > 0;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

type FeedbackState = {
  type: "success" | "error" | "info";
  text: string;
} | null;

export default function DemolishPageView() {
  const router = useRouter();
  const session = useSession();
  const hydrated = useHydrated();

  const [rows, setRows] = useState<DemolishRequestSummary[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<RequestStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [actionFeedback, setActionFeedback] = useState<FeedbackState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DemolishRequestSummary | null>(null);
  const [assetLookupRows, setAssetLookupRows] = useState<AssetOption[]>([]);
  const [assetLookupLoading, setAssetLookupLoading] = useState(false);
  const [assetLookupError, setAssetLookupError] = useState("");
  const [itemImageHintMap, setItemImageHintMap] = useState<Record<string, boolean>>({});

  const [companyId, setCompanyId] = useState("MITRPHOL");
  const [plantId, setPlantId] = useState("Plant-KLS");
  const [createdBy, setCreatedBy] = useState("asset.accounting@mitrphol.com");

  const [assetSearch, setAssetSearch] = useState("");
  const [assetId, setAssetId] = useState("");
  const [itemNote, setItemNote] = useState("");
  const [itemImageNames, setItemImageNames] = useState("");
  const [requiresExpert, setRequiresExpert] = useState(false);
  const [expertName, setExpertName] = useState("");

  const [docType, setDocType] = useState<"APPROVAL_DOC" | "BUDGET_DOC" | "OTHER">("APPROVAL_DOC");
  const [docName, setDocName] = useState("");
  const [docFileLabel, setDocFileLabel] = useState(EMPTY_FILE_LABEL);

  const [approvalActor, setApprovalActor] = useState("approver@mitrphol.com");
  const [approvalComment, setApprovalComment] = useState("");

  const refresh = () => setRows(listMockDemolishRequests());

  useEffect(() => {
    if (!hydrated) return;
    if (rowsLoaded) return;
    setRows(listMockDemolishRequests());
    setRowsLoaded(true);
  }, [hydrated, rowsLoaded]);

  const effectiveSessionId = useMemo(() => {
    if (!hydrated) return "";
    const fromHook = String(session?.sessionId || "").trim();
    if (fromHook) return fromHook;
    return String(readSession()?.sessionId || "").trim();
  }, [hydrated, session?.sessionId]);

  function selectRequest(requestId: string) {
    setSelectedId(requestId);
    setActionFeedback(null);
  }

  useEffect(() => {
    if (!hydrated) return;
    if (effectiveSessionId) return;
    clearSession();
    router.replace("/login");
  }, [effectiveSessionId, hydrated, router]);

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
  const isDraft = selected?.Status === "DRAFT";
  const canReturnToDraft = selected ? isReturnableStatus(selected.Status) : false;
  const canApproveReject = selected ? ["SUBMITTED", "PENDING"].includes(selected.Status) : false;
  const canReceive = selected?.Status === "APPROVED";
  const suggestedFlow = (selected?.TotalBookValue || 0) <= 1 ? "DEMOLISH_LE_1" : "DEMOLISH_GT_1";
  const EMPTY_HINT_MAP: Record<string, boolean> = useMemo(() => ({}), []);

  useEffect(() => {
    const currentSelected = selectedId ? getMockDemolishDetail(selectedId) : null;
    const currentIsDraft = currentSelected?.Status === "DRAFT";
    if (!currentSelected || !currentIsDraft || !effectiveSessionId) {
      setItemImageHintMap(EMPTY_HINT_MAP);
      return;
    }

    const pendingItems = currentSelected.Items.filter((x) => !x.Images.length && !x.HasExistingImage);
    if (!pendingItems.length) {
      setItemImageHintMap(EMPTY_HINT_MAP);
      return;
    }

    let cancelled = false;

    async function loadImageHints() {
      const entries = await Promise.all(
        pendingItems.map(async (item) => {
          try {
            const response = await getAssets(effectiveSessionId, {
              page: 1,
              pageSize: 20,
              search: item.AssetNo,
            });

            const found = (response.rows || []).find(
              (row) => normalizeAssetKey(row.AssetNo) === normalizeAssetKey(item.AssetNo),
            );
            return [item.DemolishRequestItemId, parseHasImage(found?.HasImage)] as const;
          } catch {
            return [item.DemolishRequestItemId, false] as const;
          }
        }),
      );

      if (cancelled) return;
      const map: Record<string, boolean> = {};
      entries.forEach(([itemId, hasImage]) => {
        if (hasImage) map[itemId] = true;
      });
      setItemImageHintMap(map);
    }

    loadImageHints();
    return () => {
      cancelled = true;
    };
  }, [EMPTY_HINT_MAP, effectiveSessionId, rows, selectedId]);

  useEffect(() => {
    if (!hydrated || !isDraft) return;

    const sid = effectiveSessionId;
    const keyword = assetSearch.trim();
    let cancelled = false;

    async function loadAssetLookup() {
      setAssetLookupLoading(true);
      setAssetLookupError("");

      try {
        if (!sid) {
          if (cancelled) return;
          setAssetLookupRows([]);
          setAssetLookupError("Session is required to search assets from database.");
          return;
        }

        const response = await getAssets(sid, {
          page: 1,
          pageSize: 200,
          search: keyword,
        });
        if (cancelled) return;

        setAssetLookupRows(
          (response.rows || []).map((row) => ({
            AssetId: row.AssetId,
            AssetNo: row.AssetNo || "",
            AssetName: row.AssetName || "",
            CostCenterName: row.CostCenterName || "",
            BookValue: Number(row.BookValue || 0),
            HasImage: parseHasImage(row.HasImage),
          })),
        );
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }
        setAssetLookupRows([]);
        setAssetLookupError(e instanceof Error ? e.message : "Failed to search assets");
      } finally {
        if (!cancelled) setAssetLookupLoading(false);
      }
    }

    loadAssetLookup();
    return () => {
      cancelled = true;
    };
  }, [assetSearch, effectiveSessionId, hydrated, isDraft, router]);

  const allAssets = assetLookupRows;
  const {
    selectableAssets,
    matchedAssetsCount,
    totalSelectableCount,
    noKeywordMatch,
  } = useMemo(() => {
    const selectedAssetIds = new Set(selected?.Items.map((x) => x.AssetId) || []);
    const keyword = assetSearch.trim();
    const matchedAssets = allAssets.filter((asset) => !selectedAssetIds.has(asset.AssetId));
    const noMatch = Boolean(keyword) && matchedAssets.length === 0;
    const options = matchedAssets.slice(0, 200);

    return {
      selectableAssets: options,
      matchedAssetsCount: matchedAssets.length,
      totalSelectableCount: matchedAssets.length,
      noKeywordMatch: noMatch,
    };
  }, [allAssets, selected?.Items, assetSearch]);

  const pickedAsset = allAssets.find((x) => x.AssetId === assetId) || null;

  function resolveAssetByInput(keyword: string, options: AssetOption[]) {
    const key = normalizeAssetKey(keyword);
    if (!key) return null;

    const exactNo = options.filter((x) => normalizeAssetKey(x.AssetNo) === key);
    if (exactNo.length === 1) return exactNo[0];

    const startsWithNo = options.filter((x) => normalizeAssetKey(x.AssetNo).startsWith(key));
    if (startsWithNo.length === 1) return startsWithNo[0];

    const includes = options.filter((x) =>
      normalizeAssetKey([x.AssetNo, x.AssetName, x.CostCenterName].join(" ")).includes(key),
    );
    if (includes.length === 1) return includes[0];

    return null;
  }

  const submitChecks = useMemo(() => {
    if (!selected) return null;

    const hasItems = selected.Items.length > 0;
    const allItemsHaveImage = selected.Items.every(
      (x) => x.Images.length > 0 || x.HasExistingImage || itemImageHintMap[x.DemolishRequestItemId],
    );
    const allExpertNameFilled = selected.Items.every(
      (x) => !x.RequiresExpertReview || Boolean((x.ExpertName || "").trim()),
    );
    const hasApprovalDoc = selected.Documents.some((x) => x.DocTypeCode === "APPROVAL_DOC");
    const needsBudgetDoc = selected.TotalBookValue > 1;
    const hasBudgetDoc = !needsBudgetDoc || selected.Documents.some((x) => x.DocTypeCode === "BUDGET_DOC");
    const underMaxLimit = selected.TotalBookValue <= DEMOLISH_BV_LIMIT;

    const blockers: string[] = [];
    if (!hasItems) blockers.push("Please add at least one asset item.");
    if (!allItemsHaveImage) blockers.push("Every asset item must have at least one image.");
    if (!allExpertNameFilled) blockers.push("Items marked as Expert Review must have expert name.");
    if (!hasApprovalDoc) blockers.push("APPROVAL_DOC is required.");
    if (!hasBudgetDoc) blockers.push("BUDGET_DOC is required when total BV > 1.");
    if (!underMaxLimit) blockers.push(`Total BV must not exceed ${DEMOLISH_BV_LIMIT.toLocaleString()}.`);

    return {
      blockers,
      canSubmit: blockers.length === 0,
    };
  }, [itemImageHintMap, selected]);

  function notify(type: NonNullable<FeedbackState>["type"], text: string) {
    setActionFeedback({ type, text });
    refresh();
  }

  function notifyError(error: unknown) {
    const text = error instanceof Error ? error.message : String(error || "Unknown error");
    notify("error", text);
  }

  function onCreateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = createMockDemolishDraft({
      companyId,
      plantId,
      createdByName: createdBy,
    });
    selectRequest(request.DemolishRequestId);
    notify("success", `Draft created: ${request.RequestNo}`);
  }

  function onAddItem() {
    if (!selected) throw new Error("Please open a request first.");
    if (!isDraft) throw new Error("Edit is locked. Use Return To Draft first.");
    if (assetLookupLoading) throw new Error("Asset search is loading. Please wait a moment.");
    if (requiresExpert && !expertName.trim()) throw new Error("Please provide expert name.");

    let chosenAssetId = assetId;
    if (!chosenAssetId && assetSearch.trim()) {
      const resolved = resolveAssetByInput(assetSearch.trim(), selectableAssets);
      if (resolved) {
        chosenAssetId = resolved.AssetId;
      }
    }
    if (!chosenAssetId) {
      throw new Error("Asset not found. Type full Asset No and pick from result list.");
    }
    const chosenAsset = selectableAssets.find((x) => x.AssetId === chosenAssetId)
      || allAssets.find((x) => x.AssetId === chosenAssetId);
    if (!chosenAsset) {
      throw new Error("Selected asset data is not available. Please search again.");
    }

    const item = upsertMockDemolishItem(selected.DemolishRequestId, {
      assetId: chosenAssetId,
      assetNo: chosenAsset.AssetNo,
      assetName: chosenAsset.AssetName,
      bookValue: chosenAsset.BookValue,
      hasExistingImage: chosenAsset.HasImage,
      note: itemNote,
      requiresExpertReview: requiresExpert,
      expertName: requiresExpert ? expertName : undefined,
    });

    addMockDemolishItemImages(
      selected.DemolishRequestId,
      item.DemolishRequestItemId,
      parseCsvText(itemImageNames),
    );

    setAssetSearch("");
    setAssetId("");
    setItemNote("");
    setItemImageNames("");
    setRequiresExpert(false);
    setExpertName("");
    notify("success", "Asset item added.");
  }

  function onAttachDocument() {
    if (!selected) throw new Error("Please open a request first.");
    if (!isDraft) throw new Error("Edit is locked. Use Return To Draft first.");
    if (!docName.trim()) throw new Error("Please enter document name.");

    addMockDemolishDocument(selected.DemolishRequestId, docType, docName.trim());
    setDocName("");
    setDocFileLabel(EMPTY_FILE_LABEL);
    notify("success", "Document attached.");
  }

  function onSubmitToApproval() {
    if (!selected) throw new Error("Please open a request first.");
    selected.Items.forEach((item) => {
      if (!item.Images.length && !item.HasExistingImage && itemImageHintMap[item.DemolishRequestItemId]) {
        markMockDemolishItemExistingImage(selected.DemolishRequestId, item.DemolishRequestItemId, true);
      }
    });
    submitMockDemolish(selected.DemolishRequestId);
    notify("success", "Request submitted to approval.");
  }

  function onReturnToDraft() {
    if (!selected) throw new Error("Please open a request first.");
    returnMockDemolishToDraft(
      selected.DemolishRequestId,
      approvalActor || createdBy,
      approvalComment || "Returned to draft from UI",
    );
    notify("success", "Request returned to DRAFT. You can edit again.");
  }

  function onDeleteDraft() {
    if (!deleteTarget) return;

    const target = deleteTarget;
    deleteMockDemolishDraft(target.DemolishRequestId);
    if (selectedId === target.DemolishRequestId) {
      setSelectedId("");
    }
    setDeleteTarget(null);
    notify("success", `Draft deleted: ${target.RequestNo}`);
  }

  return (
    <>
      <PageTitle
        title="Asset Management: Demolish"
        subtitle="Simple flow: Create Draft -> Add items/documents -> Submit -> Track status"
      />

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
              <label>Requester</label>
              <input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <button className="button button--primary" type="submit">
              Create Draft
            </button>
          </div>
          <p className="muted mt-2 text-xs">
            Request No is generated immediately after creating draft (before submit).
          </p>
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
                <th>Action</th>
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
                  <td className="whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button className="button button--ghost" type="button" onClick={() => selectRequest(row.DemolishRequestId)}>
                        Open
                      </button>
                      {row.Status === "DRAFT" ? (
                        <button
                          className="button"
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          style={{
                            borderColor: "#e7b6b6",
                            color: "#8f2b2b",
                            background: "linear-gradient(180deg, #fff5f5 0%, #ffeaea 100%)",
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
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
            3) Workspace: {selected.RequestNo} ({truncateId(selected.DemolishRequestId)})
          </h3>

          <div className="rounded-xl border border-[#d8e6f4] bg-[#f7fbff] p-3">
            <p className="text-sm font-semibold text-[#234a70]">How to use this page</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[#355b7f]">
              <li>Create draft. System gives Request No immediately.</li>
              <li>While status is DRAFT, you can add/remove items and documents.</li>
              <li>Click Submit To Approval when checklist is complete.</li>
              <li>If sent by mistake, click Return To Draft to edit again.</li>
            </ol>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="chip">DRAFT = editable</span>
              <span className="chip">SUBMITTED/PENDING = waiting approval</span>
              <span className="chip">APPROVED = waiting receive</span>
              <span className="chip">RECEIVED = closed</span>
            </div>
          </div>

          <div className="kpi-grid mt-3">
            <div className="kpi">
              <h3>Status</h3>
              <p>{selected.Status}</p>
            </div>
            <div className="kpi">
              <h3>Total BV</h3>
              <p>{formatMoney(selected.TotalBookValue)}</p>
            </div>
            <div className="kpi">
              <h3>Approval Flow</h3>
              <p>{selected.Approval?.FlowCode || suggestedFlow}</p>
            </div>
            <div className="kpi">
              <h3>Current Step</h3>
              <p>{selected.Approval?.CurrentStepName || selected.Status}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[#d8e6f4] bg-[#f7fbff] p-3">
            <h4 className="mb-2 text-sm font-semibold text-[#355b7f]">Step 1: Add Asset Item</h4>
            {!isDraft ? <p className="muted mb-2 text-xs">Editing is locked. Use Return To Draft to edit.</p> : null}

            <div className="form-grid">
              <div className="field">
                <label>Search Asset</label>
                <input
                  value={assetSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAssetSearch(value);

                    const key = normalizeAssetKey(value);
                    if (!key) {
                      setAssetId("");
                      return;
                    }

                    const exactAsset = selectableAssets.find((asset) => normalizeAssetKey(asset.AssetNo) === key);
                    setAssetId(exactAsset?.AssetId || "");
                  }}
                  placeholder="Type Asset No / Name (e.g. 101000001)"
                  disabled={!isDraft}
                />
                {isDraft ? (
                  assetLookupLoading ? (
                    <p className="muted text-xs">Searching assets from database...</p>
                  ) : assetLookupError ? (
                    <p className="text-xs text-[#8b1d1d]">Search warning: {assetLookupError}</p>
                  ) : noKeywordMatch ? (
                    <p className="text-xs text-[#8b1d1d]">
                      Asset not found in database for &quot;{assetSearch}&quot;.
                    </p>
                  ) : assetSearch.trim() ? (
                    <p className="muted text-xs">
                      Found {matchedAssetsCount} result(s). If Asset No is exact, it is auto-selected.
                    </p>
                  ) : (
                    <p className="muted text-xs">Type Asset No or Name to search from database.</p>
                  )
                ) : null}
              </div>
              <div className="field">
                <label>Select Asset Result</label>
                <select value={assetId} onChange={(e) => setAssetId(e.target.value)} disabled={!isDraft || assetLookupLoading}>
                  <option value="">Select asset</option>
                  {selectableAssets.map((asset) => (
                    <option key={asset.AssetId} value={asset.AssetId}>
                      {asset.AssetNo} - {asset.AssetName} ({asset.CostCenterName})
                    </option>
                  ))}
                </select>
                {assetSearch.trim() ? (
                  <p className="muted text-xs">
                    Showing first {selectableAssets.length} of {totalSelectableCount} result(s).
                  </p>
                ) : null}
              </div>
              <div className="field">
                <label>Note</label>
                <input value={itemNote} onChange={(e) => setItemNote(e.target.value)} placeholder="Reason / remark" disabled={!isDraft} />
              </div>
              <div className="field">
                <label>Images (comma separated file names)</label>
                <input
                  value={itemImageNames}
                  onChange={(e) => setItemImageNames(e.target.value)}
                  placeholder="asset-1.jpg,asset-2.jpg"
                  disabled={!isDraft}
                />
                <p className="muted text-xs">
                  Optional if this asset already has image in system.
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <button
                className="button button--ghost"
                type="button"
                disabled={!isDraft || !assetSearch}
                onClick={() => {
                  setAssetSearch("");
                  setAssetId("");
                }}
              >
                Clear Search
              </button>
              <label className="inline-flex items-center gap-2 text-sm text-[#355b7f]">
                <input type="checkbox" checked={requiresExpert} onChange={(e) => setRequiresExpert(e.target.checked)} disabled={!isDraft} />
                Requires expert review
              </label>
              {requiresExpert ? (
                <input
                  className="max-w-sm rounded-xl border border-[#cfdceb] bg-white px-3 py-2 text-sm"
                  value={expertName}
                  onChange={(e) => setExpertName(e.target.value)}
                  placeholder="Expert name"
                  disabled={!isDraft}
                />
              ) : null}
              <button
                className="button button--ghost"
                type="button"
                disabled={!isDraft}
                onClick={() => {
                  try {
                    onAddItem();
                  } catch (error) {
                    notifyError(error);
                  }
                }}
              >
                Add Item
              </button>
            </div>

            {pickedAsset ? (
              <p className="muted mt-2 text-xs">
                Selected: {pickedAsset.AssetNo} | {pickedAsset.AssetName} | BV {formatMoney(pickedAsset.BookValue)}
              </p>
            ) : null}
          </div>

          <div className="mt-3 rounded-xl border border-[#d8e6f4] bg-[#f7fbff] p-3">
            <h4 className="mb-2 text-sm font-semibold text-[#355b7f]">Step 2: Attach Documents</h4>
            <div className="form-grid">
              <div className="field">
                <label>Document Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)} disabled={!isDraft}>
                  <option value="APPROVAL_DOC">APPROVAL_DOC</option>
                  <option value="BUDGET_DOC">BUDGET_DOC</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div className="field">
                <label>Document Name</label>
                <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="approval.pdf" disabled={!isDraft} />
              </div>
            </div>

            <div className="mt-2.5">
              <UploadFileControl
                id="demolish-doc-file"
                label="Upload file"
                fileLabel={docFileLabel}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                buttonText="Choose file"
                helperText="For mock mode, file name is used as document reference."
                onFileChange={(file) => {
                  if (!isDraft) return;
                  if (!file) {
                    setDocFileLabel(EMPTY_FILE_LABEL);
                    return;
                  }
                  setDocFileLabel(file.name);
                  if (!docName.trim()) setDocName(file.name);
                }}
              />
            </div>

            <div className="mt-2.5">
              <button
                className="button button--ghost"
                type="button"
                disabled={!isDraft}
                onClick={() => {
                  try {
                    onAttachDocument();
                  } catch (error) {
                    notifyError(error);
                  }
                }}
              >
                Attach Document
              </button>
            </div>
          </div>

          <div className="table-wrap mt-3">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>BV</th>
                  <th>Note</th>
                  <th>Expert</th>
                  <th>Images</th>
                  <th>Action</th>
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
                    <td>{item.RequiresExpertReview ? item.ExpertName || "Required" : "-"}</td>
                    <td>
                      {item.Images.length > 0
                        ? `${item.Images.length} uploaded`
                        : item.HasExistingImage || itemImageHintMap[item.DemolishRequestItemId]
                          ? "Existing image"
                          : "No image"}
                    </td>
                    <td>
                      {isDraft ? (
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => {
                            try {
                              removeMockDemolishItem(selected.DemolishRequestId, item.DemolishRequestItemId);
                              notify("success", "Item removed.");
                            } catch (error) {
                              notifyError(error);
                            }
                          }}
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="muted text-xs">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!selected.Items.length ? (
                  <tr>
                    <td colSpan={6}>No items.</td>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selected.Documents.map((doc) => (
                  <tr key={doc.DemolishRequestDocumentId}>
                    <td>{doc.DocTypeCode}</td>
                    <td>{doc.FileName}</td>
                    <td>{formatDate(doc.UploadedAt)}</td>
                    <td>
                      {isDraft ? (
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => {
                            try {
                              removeMockDemolishDocument(selected.DemolishRequestId, doc.DemolishRequestDocumentId);
                              notify("success", "Document removed.");
                            } catch (error) {
                              notifyError(error);
                            }
                          }}
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="muted text-xs">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!selected.Documents.length ? (
                  <tr>
                    <td colSpan={4}>No documents.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-xl border border-[#d8e6f4] bg-[#f7fbff] p-3">
            <h4 className="mb-2 text-sm font-semibold text-[#355b7f]">Step 3: Submit Request</h4>

            {actionFeedback ? (
              <div
                className={[
                  "mb-2.5 rounded-xl border px-3 py-2 text-sm",
                  actionFeedback.type === "error"
                    ? "border-[#efcaca] bg-[#fff2f2] text-[#8b1d1d]"
                    : actionFeedback.type === "success"
                      ? "border-[#cdebdc] bg-[#f0fff7] text-[#0f5a35]"
                      : "border-[#c9dff3] bg-[#f7fbff] text-[#234a70]",
                ].join(" ")}
              >
                {actionFeedback.text}
              </div>
            ) : null}

            <div className="chip-list">
              <button
                className="button button--primary"
                type="button"
                disabled={!isDraft || !submitChecks?.canSubmit}
                onClick={() => {
                  try {
                    onSubmitToApproval();
                  } catch (error) {
                    notifyError(error);
                  }
                }}
              >
                Submit To Approval
              </button>
              <button
                className="button button--ghost"
                type="button"
                disabled={!canReturnToDraft}
                onClick={() => {
                  try {
                    onReturnToDraft();
                  } catch (error) {
                    notifyError(error);
                  }
                }}
              >
                Return To Draft
              </button>
            </div>

            <p className="muted mt-2 text-xs">
              Delete is available from Request List (DRAFT only). Return To Draft works in SUBMITTED/PENDING/REJECTED.
            </p>

            {isDraft && submitChecks && !submitChecks.canSubmit ? (
              <div className="mt-2 rounded-xl border border-[#c9dff3] bg-white p-2.5 text-sm text-[#234a70]">
                <p className="font-semibold">Before submit, please complete:</p>
                <ul className="mt-1 list-disc pl-5 text-xs text-[#5a748f]">
                  {submitChecks.blockers.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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

          <details className="mt-3 rounded-xl border border-[#d8e6f4] bg-[#f7fbff] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-[#355b7f]">
              Advanced: approval simulation (testing only)
            </summary>
            <div className="mt-3 form-grid">
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
                className="button button--ghost"
                type="button"
                disabled={!canApproveReject}
                onClick={() => {
                  try {
                    actionMockDemolishApproval(
                      selected.DemolishRequestId,
                      "APPROVE",
                      approvalActor,
                      approvalComment,
                    );
                    notify("success", "Approved current step.");
                  } catch (error) {
                    notifyError(error);
                  }
                }}
              >
                Approve Step
              </button>
              <button
                className="button button--ghost"
                type="button"
                disabled={!canApproveReject}
                onClick={() => {
                  try {
                    actionMockDemolishApproval(
                      selected.DemolishRequestId,
                      "REJECT",
                      approvalActor,
                      approvalComment,
                    );
                    notify("success", "Request rejected.");
                  } catch (error) {
                    notifyError(error);
                  }
                }}
              >
                Reject
              </button>
              <button
                className="button button--ghost"
                type="button"
                disabled={!canReceive}
                onClick={() => {
                  try {
                    receiveMockDemolish(selected.DemolishRequestId, approvalActor);
                    notify("success", "Marked as supplies received.");
                  } catch (error) {
                    notifyError(error);
                  }
                }}
              >
                Supplies Receive
              </button>
            </div>
          </details>
        </section>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1f33]/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#d8e6f4] bg-white p-5 shadow-[0_24px_50px_rgba(11,31,51,0.28)]">
            <h4 className="text-lg font-semibold text-[#16314b]">Delete Draft Request</h4>
            <p className="mt-2 text-sm text-[#355b7f]">
              Confirm delete <span className="font-semibold">{deleteTarget.RequestNo}</span>?
            </p>
            <p className="mt-1 text-xs text-[#6784a2]">This action cannot be undone.</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="button button--ghost" type="button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                className="button"
                type="button"
                onClick={() => {
                  try {
                    onDeleteDraft();
                  } catch (error) {
                    setDeleteTarget(null);
                    notifyError(error);
                  }
                }}
                style={{
                  borderColor: "#e7b6b6",
                  color: "#8f2b2b",
                  background: "linear-gradient(180deg, #fff5f5 0%, #ffeaea 100%)",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
