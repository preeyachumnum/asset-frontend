"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { formatDate, formatMoney } from "@/lib/format";
import { getMockAssetOptions } from "@/lib/mock-assets-service";
import {
  addMockStocktakeMeetingDoc,
  addMockStocktakeParticipant,
  carryPendingToNextMockYear,
  closeMockStocktakeYear,
  getMockStocktakeThreeTabs,
  getMockStocktakeWorkspace,
  getOrCreateMockStocktakeYearConfig,
  importMockStocktakeAccountingStatuses,
  importMockStocktakeCsv,
  listMockStocktakeAssetByCostCenter,
  markMockStocktakeReportGenerated,
  removeMockStocktakeParticipant,
  upsertMockStocktakeRecord,
} from "@/lib/mock-stocktake-service";
import type { StocktakeRecordView } from "@/lib/types";

const statusOptions: StocktakeRecordView["StatusCode"][] = [
  "COUNTED",
  "NOT_COUNTED",
  "PENDING",
  "REJECTED",
  "OTHER",
];

const EMPTY_WORKSPACE: ReturnType<typeof getMockStocktakeWorkspace> = {
  config: null,
  records: [],
  participants: [],
  meetingDocs: [],
  summary: [],
  accountingSummary: [],
};

const EMPTY_TABS: ReturnType<typeof getMockStocktakeThreeTabs> = {
  counted: [],
  notCounted: [],
  rejected: [],
};

const subscribeHydration = () => () => {};

function downloadTextFile(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function StocktakePageView() {
  const currentYear = new Date().getUTCFullYear();
  const [plantId, setPlantId] = useState("Plant-KLS");
  const [stocktakeYear, setStocktakeYear] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");

  const [countCostCenter, setCountCostCenter] = useState("");
  const [assetNo, setAssetNo] = useState("");
  const [statusCode, setStatusCode] = useState<StocktakeRecordView["StatusCode"]>("COUNTED");
  const [countMethod, setCountMethod] = useState<StocktakeRecordView["CountMethod"]>("QR");
  const [countQty, setCountQty] = useState(1);
  const [noteText, setNoteText] = useState("");
  const [countedBy, setCountedBy] = useState("asset.accounting@mitrphol.com");
  const [imageNames, setImageNames] = useState("");
  const [csvText, setCsvText] = useState("");
  const [accountingCsvText, setAccountingCsvText] = useState("");

  const [participantEmail, setParticipantEmail] = useState("");
  const [meetingDocName, setMeetingDocName] = useState("");
  const [qrType, setQrType] = useState("STICKER");
  const [qrAssetNo, setQrAssetNo] = useState("");
  const [qrScanValue, setQrScanValue] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");

  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  const workspace = hydrated
    ? (() => {
        getOrCreateMockStocktakeYearConfig(plantId, stocktakeYear);
        return getMockStocktakeWorkspace(plantId, stocktakeYear);
      })()
    : EMPTY_WORKSPACE;

  const tabs = hydrated ? getMockStocktakeThreeTabs(plantId, stocktakeYear) : EMPTY_TABS;
  const allAssets = useMemo(() => (hydrated ? getMockAssetOptions() : []), [hydrated]);

  const costCenters = useMemo(
    () => Array.from(new Set(allAssets.map((x) => x.CostCenterName).filter(Boolean))).sort(),
    [allAssets],
  );

  const assetsInCostCenter = useMemo(() => {
    if (!countCostCenter) return [];
    return listMockStocktakeAssetByCostCenter(plantId, stocktakeYear, countCostCenter);
  }, [countCostCenter, plantId, stocktakeYear]);

  useEffect(() => {
    if (!costCenters.length) return;
    if (!countCostCenter || !costCenters.includes(countCostCenter)) {
      setCountCostCenter(costCenters[0]);
    }
  }, [costCenters, countCostCenter]);

  useEffect(() => {
    if (!assetsInCostCenter.length) {
      setAssetNo("");
      return;
    }
    if (!assetsInCostCenter.some((x) => x.AssetNo === assetNo)) {
      setAssetNo(assetsInCostCenter[0].AssetNo);
    }
  }, [assetsInCostCenter, assetNo]);

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return workspace.records.filter((row) => {
      const byStatus = statusFilter === "ALL" || row.StatusCode === statusFilter;
      const bySearch =
        !keyword ||
        [row.AssetNo, row.AssetName, row.CostCenterName, row.NoteText, row.AccountingStatusCode]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return byStatus && bySearch;
    });
  }, [workspace.records, statusFilter, search]);

  const qrValue = useMemo(() => {
    if (!qrAssetNo.trim()) return "";
    return `QR|${qrType}|${plantId}|${stocktakeYear}|${qrAssetNo.trim()}`;
  }, [qrAssetNo, qrType, plantId, stocktakeYear]);

  useEffect(() => {
    let isMounted = true;

    async function generateQr() {
      if (!qrValue) {
        if (isMounted) setQrImageUrl("");
        return;
      }
      try {
        const qrcode = await import("qrcode");
        const url = await qrcode.toDataURL(qrValue, {
          width: 260,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        if (isMounted) setQrImageUrl(url);
      } catch {
        if (isMounted) setQrImageUrl("");
      }
    }

    generateQr();
    return () => {
      isMounted = false;
    };
  }, [qrValue]);

  function notify(text: string) {
    setMessage(text);
  }

  function onSubmitCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!assetNo.trim()) throw new Error("Please choose asset");
      upsertMockStocktakeRecord({
        plantId,
        stocktakeYear,
        assetNo: assetNo.trim(),
        statusCode,
        countMethod,
        countQty: Math.max(1, Number(countQty) || 1),
        noteText,
        countedByName: countedBy,
        imageNames: imageNames
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      });
      setNoteText("");
      setImageNames("");
      notify("Saved stocktake record.");
    } catch (error) {
      notify((error as Error).message);
    }
  }

  function onImportCsv() {
    try {
      const result = importMockStocktakeCsv({
        plantId,
        stocktakeYear,
        csvText,
        countedByName: countedBy,
      });
      notify(`Imported ${result.imported} rows. ${result.errors.length ? `Errors: ${result.errors.join(" | ")}` : ""}`);
      setCsvText("");
    } catch (error) {
      notify((error as Error).message);
    }
  }

  function onImportAccountingCsv() {
    try {
      const result = importMockStocktakeAccountingStatuses({
        plantId,
        stocktakeYear,
        csvText: accountingCsvText,
      });
      notify(`Imported accounting status ${result.imported} rows. ${result.errors.length ? `Errors: ${result.errors.join(" | ")}` : ""}`);
      setAccountingCsvText("");
    } catch (error) {
      notify((error as Error).message);
    }
  }

  function onImportCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.readAsText(file);
  }

  function onImportAccountingFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAccountingCsvText(String(reader.result || ""));
    reader.readAsText(file);
  }

  function onUseScannedQr() {
    const parts = qrScanValue.trim().split("|");
    if (parts.length !== 5 || parts[0] !== "QR") {
      notify("Invalid QR format. Expected QR|TYPE|PLANT|YEAR|ASSET_NO");
      return;
    }
    const scannedAssetNo = parts[4]?.trim();
    if (!scannedAssetNo) {
      notify("QR does not contain asset no");
      return;
    }
    const asset = allAssets.find((x) => x.AssetNo === scannedAssetNo);
    if (!asset) {
      notify("Asset from QR is not found in mock asset master");
      return;
    }
    setCountMethod("QR");
    setAssetNo(asset.AssetNo);
    setCountCostCenter(asset.CostCenterName || "");
    notify(`Loaded asset ${asset.AssetNo} from scanned QR`);
  }

  return (
    <>
      <PageTitle
        title="การตรวจนับทรัพย์สิน"
        subtitle="QR Generation, รอบปี, บันทึกผลนับ, Import Excel และ Import สถานะทางบัญชี"
      />

      {message ? (
        <section className="panel">
          <p className="muted">{message}</p>
        </section>
      ) : null}

      <section className="panel">
        <div className="kpi-grid">
          <div className="kpi">
            <h3>Plant</h3>
            <p>{plantId}</p>
          </div>
          <div className="kpi">
            <h3>Year</h3>
            <p>{stocktakeYear}</p>
          </div>
          <div className="kpi">
            <h3>Config</h3>
            <p>{workspace.config?.IsOpen ? "OPEN" : "CLOSED"}</p>
            <p className="muted mt-1">Report: {workspace.config?.ReportGeneratedAt ? "READY" : "MISSING"}</p>
          </div>
          <div className="kpi">
            <h3>Records</h3>
            <p>{workspace.records.length}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">1) Generate QR (Sticker/A4/A5)</h3>
        <div className="form-grid">
          <div className="field">
            <label>QR Type</label>
            <select value={qrType} onChange={(e) => setQrType(e.target.value)}>
              <option value="STICKER">QR Sticker</option>
              <option value="LASER_A4">QR Laser A4</option>
              <option value="LASER_A5">QR Laser A5</option>
            </select>
          </div>
          <div className="field">
            <label>Asset No</label>
            <input value={qrAssetNo} onChange={(e) => setQrAssetNo(e.target.value)} placeholder="100-001-2020" />
          </div>
          <div className="field">
            <label>Generated QR Value</label>
            <input value={qrValue || "-"} disabled />
          </div>
          <div className="field">
            <label>Mobile Scan Payload (paste)</label>
            <input
              value={qrScanValue}
              onChange={(e) => setQrScanValue(e.target.value)}
              placeholder="QR|STICKER|Plant-KLS|2026|100-001-2020"
            />
          </div>
        </div>

        <div className="chip-list mt-3">
          <button className="button button--ghost" type="button" onClick={onUseScannedQr}>
            Use Scanned QR
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={() => {
              if (!qrValue || !qrImageUrl) {
                notify("Please enter asset no before download QR");
                return;
              }
              const a = document.createElement("a");
              a.href = qrImageUrl;
              a.download = `qr-${qrAssetNo || "asset"}-${qrType}.png`;
              a.click();
            }}
          >
            Download QR PNG
          </button>
        </div>

        {qrImageUrl ? (
          <div className="mt-3 rounded-xl border border-[#d8e6f4] bg-white p-3">
            <Image src={qrImageUrl} alt={`QR ${qrValue}`} width={220} height={220} unoptimized />
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h3 className="mb-2.5">2) Year Config and Close/Open</h3>
        <div className="form-grid">
          <div className="field">
            <label>Plant</label>
            <input value={plantId} onChange={(e) => setPlantId(e.target.value)} />
          </div>
          <div className="field">
            <label>Stocktake Year</label>
            <input type="number" value={stocktakeYear} onChange={(e) => setStocktakeYear(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Actor</label>
            <input value={countedBy} onChange={(e) => setCountedBy(e.target.value)} />
          </div>
        </div>

        <div className="chip-list mt-3">
          <button
            className="button button--ghost"
            type="button"
            onClick={() => {
              try {
                markMockStocktakeReportGenerated(plantId, stocktakeYear);
                notify("Marked report generated.");
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          >
            Mark Report Generated
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={() => {
              try {
                closeMockStocktakeYear(plantId, stocktakeYear, countedBy);
                notify("Closed stocktake year.");
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          >
            Close Year
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={() => {
              try {
                const carried = carryPendingToNextMockYear(plantId, stocktakeYear, stocktakeYear + 1, countedBy);
                notify(`Opened ${stocktakeYear + 1} and carried ${carried} pending record(s).`);
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          >
            Open Next Year + Carry Pending
          </button>
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">3) Count Entry (Web: select Cost Center + Asset)</h3>
        <form onSubmit={onSubmitCount}>
          <div className="form-grid">
            <div className="field">
              <label>Cost Center</label>
              <select value={countCostCenter} onChange={(e) => setCountCostCenter(e.target.value)}>
                {!costCenters.length ? <option value="">No cost center</option> : null}
                {costCenters.map((cca) => (
                  <option key={cca} value={cca}>
                    {cca}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Asset</label>
              <select value={assetNo} onChange={(e) => setAssetNo(e.target.value)}>
                {!assetsInCostCenter.length ? <option value="">No assets in selected cost center</option> : null}
                {assetsInCostCenter.map((asset) => (
                  <option key={asset.AssetId} value={asset.AssetNo}>
                    {asset.AssetNo} - {asset.AssetName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Status Code</label>
              <select value={statusCode} onChange={(e) => setStatusCode(e.target.value as StocktakeRecordView["StatusCode"])}>
                {statusOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Method</label>
              <select value={countMethod} onChange={(e) => setCountMethod(e.target.value as StocktakeRecordView["CountMethod"])}>
                <option value="QR">QR</option>
                <option value="MANUAL">MANUAL</option>
                <option value="EXCEL">EXCEL</option>
              </select>
            </div>
            <div className="field">
              <label>Qty</label>
              <input type="number" min={1} value={countQty} onChange={(e) => setCountQty(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Counted By</label>
              <input value={countedBy} onChange={(e) => setCountedBy(e.target.value)} />
            </div>
            <div className="field">
              <label>Image Names (comma)</label>
              <input value={imageNames} onChange={(e) => setImageNames(e.target.value)} placeholder="a.jpg,b.jpg" />
            </div>
            <div className="field">
              <label>Note</label>
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <button className="button button--primary" type="submit">
              Save Count
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">4) Import Count from Excel (CSV)</h3>
        <div className="field">
          <label>Upload file (.csv)</label>
          <input type="file" accept=".csv,.txt" onChange={onImportCsvFile} />
        </div>
        <div className="field mt-2.5">
          <label>CSV: assetNo,statusCode,note,method,qty</label>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} />
        </div>
        <div className="mt-3">
          <button className="button button--ghost" type="button" onClick={onImportCsv}>
            Import Count CSV
          </button>
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">5) Import Accounting Status (SUBMIT/APPROVED/REJECT)</h3>
        <div className="field">
          <label>Upload accounting file (.csv)</label>
          <input type="file" accept=".csv,.txt" onChange={onImportAccountingFile} />
        </div>
        <div className="field mt-2.5">
          <label>CSV: assetNo,accountingStatusCode</label>
          <textarea value={accountingCsvText} onChange={(e) => setAccountingCsvText(e.target.value)} />
        </div>
        <div className="chip-list mt-3">
          <button className="button button--ghost" type="button" onClick={onImportAccountingCsv}>
            Import Accounting Status
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={() =>
              downloadTextFile(
                "stocktake-accounting-template.csv",
                "100-001-2020,SUBMIT\n100-017-2019,APPROVED\n200-552-2017,REJECT",
              )
            }
          >
            Download Template
          </button>
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">6) Participants and Meeting Documents</h3>
        <div className="form-grid">
          <div className="field">
            <label>Participant Email</label>
            <input value={participantEmail} onChange={(e) => setParticipantEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Meeting Document Name</label>
            <input value={meetingDocName} onChange={(e) => setMeetingDocName(e.target.value)} />
          </div>
        </div>
        <div className="chip-list mt-3">
          <button
            className="button button--ghost"
            type="button"
            onClick={() => {
              if (!participantEmail.trim()) return;
              addMockStocktakeParticipant({
                plantId,
                stocktakeYear,
                email: participantEmail.trim(),
              });
              setParticipantEmail("");
              notify("Added participant.");
            }}
          >
            Add Participant
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={() => {
              if (!meetingDocName.trim()) return;
              addMockStocktakeMeetingDoc({
                plantId,
                stocktakeYear,
                fileName: meetingDocName.trim(),
              });
              setMeetingDocName("");
              notify("Added meeting document.");
            }}
          >
            Add Meeting Doc
          </button>
        </div>
        <div className="table-wrap mt-2.5">
          <table className="table">
            <thead>
              <tr>
                <th>Participants</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workspace.participants.map((participant) => (
                <tr key={participant.StocktakeParticipantId}>
                  <td>
                    {participant.DisplayName} ({participant.Email})
                  </td>
                  <td>
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => {
                        removeMockStocktakeParticipant(participant.StocktakeParticipantId);
                        notify("Removed participant.");
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!workspace.participants.length ? (
                <tr>
                  <td colSpan={2}>No participants.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">7) Summary and 3-tabs Status Report</h3>
        <div className="chip-list">
          {workspace.summary.map((row) => (
            <span className="chip" key={row.StatusCode}>
              {row.StatusCode}: {row.ItemCount}
            </span>
          ))}
        </div>
        <div className="chip-list mt-2.5">
          {workspace.accountingSummary.map((row) => (
            <span className="chip" key={row.StatusCode}>
              Accounting {row.StatusCode}: {row.ItemCount}
            </span>
          ))}
        </div>
        <div className="chip-list mt-2.5">
          <span className="chip">Counted: {tabs.counted.length}</span>
          <span className="chip">Not Counted: {tabs.notCounted.length}</span>
          <span className="chip">Pending/Rejected: {tabs.rejected.length}</span>
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-2.5">8) Count Records</h3>
        <div className="form-grid">
          <div className="field">
            <label>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">ALL</option>
              {statusOptions.map((x) => (
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
                <th>Asset</th>
                <th>Status</th>
                <th>Accounting</th>
                <th>Method</th>
                <th>Qty</th>
                <th>Book Value</th>
                <th>Counted By</th>
                <th>Counted At</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((row) => (
                <tr key={row.StocktakeRecordId}>
                  <td>
                    {row.AssetNo} - {row.AssetName}
                    <p className="muted">
                      {row.CostCenterName} / {row.LocationName}
                    </p>
                  </td>
                  <td>
                    <StatusChip status={row.StatusCode} />
                  </td>
                  <td>{row.AccountingStatusCode || "-"}</td>
                  <td>{row.CountMethod}</td>
                  <td>{row.CountedQty}</td>
                  <td>{formatMoney(row.BookValue)}</td>
                  <td>{row.CountedByName}</td>
                  <td>{formatDate(row.CountedAt)}</td>
                  <td>{row.NoteText || "-"}</td>
                </tr>
              ))}
              {!filteredRecords.length ? (
                <tr>
                  <td colSpan={9}>No records.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
