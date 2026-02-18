"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { UploadFileControl } from "@/components/upload-file-control";
import {
  ApiError,
  closeStocktakeYear,
  getAssets,
  getStocktakeWorkspace,
  importStocktakeCounts,
  openNextStocktakeYear,
  scanStocktakeAsset,
} from "@/lib/asset-api";
import { formatDate, formatMoney } from "@/lib/format";
import { clearSession, readSession, useHydrated, useSession } from "@/lib/session";
import type { AssetRow, StocktakeWorkspaceData } from "@/lib/types";

type NoticeTone = "success" | "error" | "info";

type Notice = {
  tone: NoticeTone;
  text: string;
} | null;

type CountMethod = "QR" | "BARCODE" | "MANUAL" | "EXCEL";

const DEFAULT_STATUS_CODES = ["COUNTED", "NOT_COUNTED", "OTHER", "PENDING"];

const STATUS_LABELS: Record<string, string> = {
  COUNTED: "Normal",
  ACTIVE: "Normal",
  NORMAL: "Normal",
  NOT_COUNTED: "Not Found",
  NOT_FOUND: "Not Found",
  LOST: "Not Found",
  DAMAGED: "Damaged",
  OTHER: "Damaged",
  REJECTED: "Damaged",
  PENDING_DEMOLISH: "Pending Demolish",
  PENDING: "Pending Demolish",
};

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeAssetNo(value: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function statusLabel(code: string) {
  return STATUS_LABELS[String(code || "").toUpperCase()] || code;
}

function pickPrimaryStatuses(available: Set<string>) {
  const groups = [
    { aliases: ["COUNTED", "ACTIVE", "NORMAL"], fallback: "COUNTED" },
    { aliases: ["NOT_COUNTED", "NOT_FOUND", "LOST"], fallback: "NOT_COUNTED" },
    { aliases: ["DAMAGED", "OTHER", "REJECTED"], fallback: "OTHER" },
    { aliases: ["PENDING_DEMOLISH", "PENDING"], fallback: "PENDING" },
  ];

  const selected: string[] = [];
  groups.forEach((group) => {
    const found = group.aliases.find((code) => available.has(code));
    selected.push(found || group.fallback);
  });

  return selected;
}

function parseScanValue(value: string): { assetNo: string; method: CountMethod } | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (!raw.includes("|")) {
    return { assetNo: raw, method: "BARCODE" };
  }

  const parts = raw
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!parts.length) return null;

  const prefix = parts[0].toUpperCase();
  if (prefix === "QR") {
    const assetNo = parts[4] || parts[parts.length - 1] || "";
    if (!assetNo) return null;
    return { assetNo, method: "QR" };
  }

  if (prefix === "BARCODE" || prefix === "BAR" || prefix === "BC") {
    const assetNo = parts[parts.length - 1] || "";
    if (!assetNo) return null;
    return { assetNo, method: "BARCODE" };
  }

  const assetNo = parts[parts.length - 1] || "";
  if (!assetNo) return null;
  return { assetNo, method: "BARCODE" };
}

function noticeClassName(tone: NoticeTone) {
  if (tone === "error") return "rounded-xl border border-[#efcaca] bg-[#fff2f2] px-3 py-2 text-sm text-[#8b1d1d]";
  if (tone === "success") return "rounded-xl border border-[#cdebdc] bg-[#f0fff7] px-3 py-2 text-sm text-[#0f5a35]";
  return "rounded-xl border border-[#c9dff3] bg-[#f7fbff] px-3 py-2 text-sm text-[#234a70]";
}

export default function StocktakePageView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();

  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const [filterStatusCode, setFilterStatusCode] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [workspace, setWorkspace] = useState<StocktakeWorkspaceData | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  const [assetSearch, setAssetSearch] = useState("");
  const [assetRows, setAssetRows] = useState<AssetRow[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [scanValue, setScanValue] = useState("");

  const [scanStatusCode, setScanStatusCode] = useState("COUNTED");
  const [countMethod, setCountMethod] = useState<CountMethod>("QR");
  const [noteText, setNoteText] = useState("");
  const [scanImageFile, setScanImageFile] = useState<File | null>(null);
  const [scanBusy, setScanBusy] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMethod, setImportMethod] = useState<CountMethod>("EXCEL");
  const [importBusy, setImportBusy] = useState(false);

  const [yearBusy, setYearBusy] = useState(false);

  const [workspaceNotice, setWorkspaceNotice] = useState<Notice>(null);
  const [scanNotice, setScanNotice] = useState<Notice>(null);
  const [importNotice, setImportNotice] = useState<Notice>(null);

  const effectiveSessionId = useMemo(() => {
    if (!hydrated) return "";
    const fromHook = String(session?.sessionId || "").trim();
    if (fromHook) return fromHook;
    return String(readSession()?.sessionId || "").trim();
  }, [hydrated, session?.sessionId]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>(DEFAULT_STATUS_CODES.map((x) => x.toUpperCase()));
    (workspace?.summary || []).forEach((row) => {
      if (row.StatusCode) values.add(row.StatusCode);
    });
    const primary = pickPrimaryStatuses(values);
    const rest = Array.from(values).filter((code) => !primary.includes(code));
    return [...primary, ...rest];
  }, [workspace?.summary]);

  const selectedAsset = useMemo(
    () => assetRows.find((row) => row.AssetId === selectedAssetId) || null,
    [assetRows, selectedAssetId],
  );

  useEffect(() => {
    if (!statusOptions.includes(scanStatusCode)) {
      setScanStatusCode(statusOptions[0] || "COUNTED");
    }
  }, [scanStatusCode, statusOptions]);

  useEffect(() => {
    if (!hydrated) return;
    if (effectiveSessionId) return;
    clearSession();
    router.replace("/login");
  }, [effectiveSessionId, hydrated, router]);

  const loadWorkspace = useCallback(async () => {
    if (!effectiveSessionId) return;

    setLoadingWorkspace(true);
    try {
      const data = await getStocktakeWorkspace(effectiveSessionId, {
        year,
        statusCode: filterStatusCode,
        search,
      });
      setWorkspace(data);
      setWorkspaceNotice(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setWorkspaceNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to load workspace",
      });
    } finally {
      setLoadingWorkspace(false);
    }
  }, [effectiveSessionId, filterStatusCode, router, search, year]);

  useEffect(() => {
    if (!hydrated || !effectiveSessionId) return;
    loadWorkspace();
  }, [effectiveSessionId, hydrated, loadWorkspace]);

  const loadAssets = useCallback(
    async (keyword: string, autoPickExact = false) => {
      if (!effectiveSessionId) return;

      setAssetLoading(true);
      try {
        const response = await getAssets(effectiveSessionId, {
          page: 1,
          pageSize: 100,
          search: keyword,
        });

        const rows = response.rows || [];
        setAssetRows(rows);

        if (autoPickExact && keyword.trim()) {
          const key = normalizeAssetNo(keyword);
          const exact = rows.find((row) => normalizeAssetNo(row.AssetNo) === key);
          if (exact) setSelectedAssetId(exact.AssetId);
        }
      } catch (error) {
        setScanNotice({
          tone: "error",
          text: error instanceof Error ? error.message : "Failed to search assets",
        });
      } finally {
        setAssetLoading(false);
      }
    },
    [effectiveSessionId],
  );

  useEffect(() => {
    if (!hydrated || !effectiveSessionId) return;
    loadAssets("", false);
  }, [effectiveSessionId, hydrated, loadAssets]);

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  async function onScanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!effectiveSessionId) return;

    if (!selectedAssetId) {
      setScanNotice({ tone: "error", text: "Please select asset." });
      return;
    }

    if (!scanImageFile) {
      setScanNotice({ tone: "error", text: "Please upload evidence image." });
      return;
    }

    setScanBusy(true);
    try {
      await scanStocktakeAsset(effectiveSessionId, {
        year,
        assetId: selectedAssetId,
        statusCode: scanStatusCode,
        countMethod,
        noteText,
        image: scanImageFile,
      });

      setNoteText("");
      setScanImageFile(null);
      setScanNotice({ tone: "success", text: "Saved count result." });
      await loadWorkspace();
    } catch (error) {
      setScanNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to save count result",
      });
    } finally {
      setScanBusy(false);
    }
  }

  async function onImportSubmit() {
    if (!effectiveSessionId) return;

    if (!importFile) {
      setImportNotice({ tone: "error", text: "Please select file." });
      return;
    }

    setImportBusy(true);
    try {
      const response = await importStocktakeCounts(effectiveSessionId, {
        year,
        file: importFile,
        countMethod: importMethod,
      });

      setImportNotice({
        tone: "success",
        text: `Import complete: parsed ${response.parsedRows} / imported ${response.importedRows}`,
      });
      setImportFile(null);
      await loadWorkspace();
    } catch (error) {
      setImportNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Import failed",
      });
    } finally {
      setImportBusy(false);
    }
  }

  async function onCloseYear() {
    if (!effectiveSessionId) return;

    setYearBusy(true);
    try {
      await closeStocktakeYear(effectiveSessionId, year);
      setWorkspaceNotice({ tone: "success", text: `Year ${year} closed.` });
      await loadWorkspace();
    } catch (error) {
      setWorkspaceNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to close year",
      });
    } finally {
      setYearBusy(false);
    }
  }

  async function onOpenNextYear() {
    if (!effectiveSessionId) return;

    setYearBusy(true);
    try {
      const response = await openNextStocktakeYear(effectiveSessionId, {
        fromYear: year,
        toYear: year + 1,
      });
      setYear(response.toYear);
      setWorkspaceNotice({ tone: "success", text: `Year ${response.toYear} is ready with pending carry-over.` });
    } catch (error) {
      setWorkspaceNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to open next year",
      });
    } finally {
      setYearBusy(false);
    }
  }

  async function onUseScannedCode() {
    const parsed = parseScanValue(scanValue);
    if (!parsed) {
      setScanNotice({ tone: "error", text: "Scan code format is invalid." });
      return;
    }

    const assetNo = parsed.assetNo;

    setAssetSearch(assetNo);
    await loadAssets(assetNo, true);
    setCountMethod(parsed.method);
    setScanNotice({ tone: "info", text: `Loaded from scan: ${assetNo}` });
  }

  const scanFileLabel = scanImageFile
    ? `${scanImageFile.name} (${formatFileSize(scanImageFile.size)})`
    : "No image selected";
  const importFileLabel = importFile
    ? `${importFile.name} (${formatFileSize(importFile.size)})`
    : "No file selected";

  return (
    <>
      <PageTitle title="Asset Inventory Count" subtitle="Setup -> Count -> Import -> Review" />

      <section className="panel">
        <h3 className="mb-2.5">1) Setup Workspace</h3>

        <form className="form-grid" onSubmit={onSearchSubmit}>
          <div className="field">
            <label>Year</label>
            <input type="number" value={year} onChange={(event) => setYear(Number(event.target.value) || currentYear)} />
          </div>

          <div className="field">
            <label>Status</label>
            <select value={filterStatusCode} onChange={(event) => setFilterStatusCode(event.target.value)}>
              <option value="">ALL</option>
              {statusOptions.map((code) => (
                <option key={code} value={code}>
                  {statusLabel(code)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Search</label>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Asset No / Name"
            />
          </div>

          <div className="field self-end">
            <button className="button button--primary" type="submit" disabled={loadingWorkspace}>
              {loadingWorkspace ? "Loading..." : "Load"}
            </button>
          </div>
        </form>

        <div className="chip-list mt-3">
          <button className="button button--ghost" type="button" disabled={yearBusy} onClick={onCloseYear}>
            Close Year
          </button>
          <button className="button button--ghost" type="button" disabled={yearBusy} onClick={onOpenNextYear}>
            Open Next Year + Carry Pending
          </button>
        </div>

        {workspaceNotice ? <div className={`mt-3 ${noticeClassName(workspaceNotice.tone)}`}>{workspaceNotice.text}</div> : null}

        <div className="kpi-grid mt-3">
          <div className="kpi">
            <h3>Stocktake ID</h3>
            <p>{workspace?.stocktakeId || "-"}</p>
          </div>
          <div className="kpi">
            <h3>Year Status</h3>
            <p>{workspace?.config?.isOpen ? "OPEN" : "CLOSED"}</p>
          </div>
          <div className="kpi">
            <h3>Detail Rows</h3>
            <p>{workspace?.details?.length || 0}</p>
          </div>
          <div className="kpi">
            <h3>Pending</h3>
            <p>{workspace?.pendingItems?.length || 0}</p>
          </div>
        </div>

        <div className="chip-list mt-3">
          {(workspace?.summary || []).map((row) => (
            <span key={row.StatusCode} className="chip">
              {statusLabel(row.StatusCode)}: {row.ItemCount}
            </span>
          ))}
          {!workspace?.summary?.length ? <span className="muted text-sm">No summary rows.</span> : null}
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">2) Count Asset</h3>

        <div className="form-grid">
          <div className="field">
            <label>Scan Code</label>
            <input
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              placeholder="QR|...|ASSET_NO or BARCODE or Asset No"
            />
          </div>
          <div className="field self-end">
            <button className="button button--ghost" type="button" onClick={onUseScannedCode}>
              Use Scan Code
            </button>
          </div>

          <div className="field">
            <label>Search Asset</label>
            <input
              value={assetSearch}
              onChange={(event) => setAssetSearch(event.target.value)}
              placeholder="Asset No / Name"
            />
          </div>
          <div className="field self-end">
            <button
              className="button button--ghost"
              type="button"
              disabled={assetLoading}
              onClick={() => loadAssets(assetSearch.trim(), true)}
            >
              {assetLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        <form className="mt-3" onSubmit={onScanSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Asset</label>
              <select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)}>
                <option value="">Select asset</option>
                {assetRows.map((asset) => (
                  <option key={asset.AssetId} value={asset.AssetId}>
                    {asset.AssetNo} - {asset.AssetName}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Status</label>
              <select value={scanStatusCode} onChange={(event) => setScanStatusCode(event.target.value)}>
                {statusOptions.map((code) => (
                  <option key={code} value={code}>
                    {statusLabel(code)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Method</label>
              <select
                value={countMethod}
                onChange={(event) => setCountMethod(event.target.value as CountMethod)}
              >
                <option value="QR">QR</option>
                <option value="BARCODE">BARCODE</option>
                <option value="MANUAL">MANUAL</option>
                <option value="EXCEL">EXCEL</option>
              </select>
            </div>

            <div className="field">
              <label>Note</label>
              <input value={noteText} onChange={(event) => setNoteText(event.target.value)} />
            </div>
          </div>

          <div className="mt-3">
            <UploadFileControl
              id="stocktake-evidence-image"
              label="Evidence Image (required)"
              fileLabel={scanFileLabel}
              accept="image/*"
              buttonText="Choose image"
              onFileChange={(file) => setScanImageFile(file)}
            />
          </div>

          <div className="chip-list mt-3">
            <button className="button button--primary" type="submit" disabled={scanBusy}>
              {scanBusy ? "Saving..." : "Save Count"}
            </button>
          </div>

          {selectedAsset ? (
            <p className="muted mt-2 text-sm">
              {selectedAsset.AssetNo} | {selectedAsset.AssetName} | {formatMoney(Number(selectedAsset.BookValue || 0))}
            </p>
          ) : null}
        </form>

        {scanNotice ? <div className={`mt-3 ${noticeClassName(scanNotice.tone)}`}>{scanNotice.text}</div> : null}
      </section>

      <section className="panel">
        <h3 className="mb-2.5">3) Import Count File</h3>

        <div className="form-grid">
          <div className="field">
            <label>Import Method</label>
            <select
              value={importMethod}
              onChange={(event) => setImportMethod(event.target.value as CountMethod)}
            >
              <option value="EXCEL">EXCEL</option>
              <option value="MANUAL">MANUAL</option>
              <option value="QR">QR</option>
              <option value="BARCODE">BARCODE</option>
            </select>
          </div>
          <div className="field self-end">
            <button className="button button--ghost" type="button" disabled={importBusy} onClick={onImportSubmit}>
              {importBusy ? "Importing..." : "Import"}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <UploadFileControl
            id="stocktake-import-file"
            label="Import File (.csv/.xlsx/.xls/.txt)"
            fileLabel={importFileLabel}
            accept=".csv,.xlsx,.xls,.txt"
            buttonText="Choose file"
            onFileChange={(file) => setImportFile(file)}
          />
        </div>

        {importNotice ? <div className={`mt-3 ${noticeClassName(importNotice.tone)}`}>{importNotice.text}</div> : null}
      </section>

      <section className="panel">
        <h3 className="mb-2.5">4) Pending Items</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Asset No</th>
                <th>Asset Name</th>
                <th>Book Value</th>
                <th>Note</th>
                <th>Counted At</th>
              </tr>
            </thead>
            <tbody>
              {(workspace?.pendingItems || []).map((row, index) => (
                <tr key={`${row.AssetNo}-${index}`}>
                  <td>{row.AssetNo}</td>
                  <td>{row.AssetName}</td>
                  <td>{formatMoney(Number(row.BookValue || 0))}</td>
                  <td>{row.NoteText || "-"}</td>
                  <td>{formatDate(row.CountedAt)}</td>
                </tr>
              ))}
              {!workspace?.pendingItems?.length ? (
                <tr>
                  <td colSpan={5}>No pending items.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">5) Count Details</h3>
        {loadingWorkspace ? <p className="muted mb-2 text-sm">Loading...</p> : null}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Status</th>
                <th>Method</th>
                <th>Book Value</th>
                <th>Counted By</th>
                <th>Counted At</th>
                <th>Images</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {(workspace?.details || []).map((row) => (
                <tr key={`${row.AssetId}-${row.CountedAt || "na"}`}>
                  <td>
                    {row.AssetNo} - {row.AssetName}
                  </td>
                  <td>
                    <StatusChip status={row.StatusCode} />
                  </td>
                  <td>{row.CountMethod || "-"}</td>
                  <td>{formatMoney(Number(row.BookValue || 0))}</td>
                  <td>{row.CountedByName || row.CountedByEmail || "-"}</td>
                  <td>{formatDate(row.CountedAt)}</td>
                  <td>{row.ImageCount || 0}</td>
                  <td>{row.NoteText || "-"}</td>
                </tr>
              ))}
              {!workspace?.details?.length ? (
                <tr>
                  <td colSpan={8}>No detail rows.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
