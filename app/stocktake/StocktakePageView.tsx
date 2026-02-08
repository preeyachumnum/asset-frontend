"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { formatDate, formatMoney } from "@/lib/format";
import {
  addMockStocktakeMeetingDoc,
  addMockStocktakeParticipant,
  carryPendingToNextMockYear,
  closeMockStocktakeYear,
  getMockStocktakeThreeTabs,
  getMockStocktakeWorkspace,
  getOrCreateMockStocktakeYearConfig,
  importMockStocktakeCsv,
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

export default function StocktakePageView() {
  const currentYear = new Date().getFullYear();
  const [plantId, setPlantId] = useState("Plant-KLS");
  const [stocktakeYear, setStocktakeYear] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");

  const [assetNo, setAssetNo] = useState("");
  const [statusCode, setStatusCode] = useState<StocktakeRecordView["StatusCode"]>("COUNTED");
  const [countMethod, setCountMethod] = useState<StocktakeRecordView["CountMethod"]>("QR");
  const [countQty, setCountQty] = useState(1);
  const [noteText, setNoteText] = useState("");
  const [countedBy, setCountedBy] = useState("asset.accounting@mitrphol.com");
  const [imageNames, setImageNames] = useState("");
  const [csvText, setCsvText] = useState("");

  const [participantEmail, setParticipantEmail] = useState("");
  const [meetingDocName, setMeetingDocName] = useState("");
  const [qrType, setQrType] = useState("STICKER");
  const [qrAssetNo, setQrAssetNo] = useState("");

  getOrCreateMockStocktakeYearConfig(plantId, stocktakeYear);
  const workspace = getMockStocktakeWorkspace(plantId, stocktakeYear);
  const tabs = getMockStocktakeThreeTabs(plantId, stocktakeYear);

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return workspace.records.filter((row) => {
      const byStatus = statusFilter === "ALL" || row.StatusCode === statusFilter;
      const bySearch =
        !keyword ||
        [row.AssetNo, row.AssetName, row.CostCenterName, row.NoteText]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return byStatus && bySearch;
    });
  }, [workspace.records, statusFilter, search]);

  const qrValue = useMemo(() => {
    if (!qrAssetNo.trim()) return "-";
    return `QR|${qrType}|${plantId}|${stocktakeYear}|${qrAssetNo.trim()}`;
  }, [qrAssetNo, qrType, plantId, stocktakeYear]);

  function notify(text: string) {
    setMessage(text);
  }

  function onSubmitCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
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
      setAssetNo("");
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

  function onImportCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ""));
    };
    reader.readAsText(file);
  }

  return (
    <>
      <PageTitle
        title="Stocktake Menu (Mock)"
        subtitle="ครบงานเร่งด่วน: QR, Year config, scan/manual, excel import, participants, meeting docs, 3-tab report"
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
          </div>
          <div className="kpi">
            <h3>Records</h3>
            <p>{workspace.records.length}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>1) QR Generation</h3>
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
            <input value={qrValue} disabled />
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>2) Year Config and Close/Open</h3>
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
            <label>Closed By</label>
            <input value={countedBy} onChange={(e) => setCountedBy(e.target.value)} />
          </div>
        </div>
        <div className="chip-list" style={{ marginTop: 12 }}>
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
        <h3 style={{ marginBottom: 10 }}>3) Count Entry (QR / Manual / Excel)</h3>
        <form onSubmit={onSubmitCount}>
          <div className="form-grid">
            <div className="field">
              <label>Asset No</label>
              <input value={assetNo} onChange={(e) => setAssetNo(e.target.value)} required />
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
          <div style={{ marginTop: 12 }}>
            <button className="button button--primary" type="submit">
              Save Count
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>4) Excel Import (CSV mock)</h3>
        <div className="field">
          <label>Upload file (.csv)</label>
          <input type="file" accept=".csv,.txt" onChange={onImportCsvFile} />
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label>CSV text format: assetNo,statusCode,note,method,qty</label>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="button button--ghost" type="button" onClick={onImportCsv}>
            Import CSV
          </button>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>5) Participants and Meeting Documents</h3>
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
        <div className="chip-list" style={{ marginTop: 12 }}>
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
        <div className="table-wrap" style={{ marginTop: 10 }}>
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
        <h3 style={{ marginBottom: 10 }}>6) Summary and 3-tabs Status Report</h3>
        <div className="chip-list">
          {workspace.summary.map((row) => (
            <span className="chip" key={row.StatusCode}>
              {row.StatusCode}: {row.ItemCount}
            </span>
          ))}
        </div>
        <div className="chip-list" style={{ marginTop: 10 }}>
          <span className="chip">Counted: {tabs.counted.length}</span>
          <span className="chip">Not Counted: {tabs.notCounted.length}</span>
          <span className="chip">Rejected: {tabs.rejected.length}</span>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>7) Count Records</h3>
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
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Status</th>
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
                    <p className="muted">{row.CostCenterName} / {row.LocationName}</p>
                  </td>
                  <td>
                    <StatusChip status={row.StatusCode} />
                  </td>
                  <td>{row.CountMethod}</td>
                  <td>{row.CountedQty}</td>
                  <td>{formatMoney(0)}</td>
                  <td>{row.CountedByName}</td>
                  <td>{formatDate(row.CountedAt)}</td>
                  <td>{row.NoteText || "-"}</td>
                </tr>
              ))}
              {!filteredRecords.length ? (
                <tr>
                  <td colSpan={8}>No records.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
