"use client";

import { useMemo, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { formatDate, formatMoney } from "@/lib/format";
import { getMockManagementTrackingRows, rowsToCsv } from "@/lib/mock-report-service";
import {
  getMockStocktakeReport,
  getMockStocktakeThreeTabs,
} from "@/lib/mock-stocktake-service";

function downloadCsv(fileName: string, csvText: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPageView() {
  const currentYear = new Date().getFullYear();
  const [plantId, setPlantId] = useState("Plant-KLS");
  const [stocktakeYear, setStocktakeYear] = useState(currentYear);
  const [statusCode, setStatusCode] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [costCenterKeyword, setCostCenterKeyword] = useState("");
  const [assetGroupKeyword, setAssetGroupKeyword] = useState("");
  const [locationKeyword, setLocationKeyword] = useState("");
  const [month, setMonth] = useState<number | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const report = useMemo(
    () =>
      getMockStocktakeReport({
        PlantId: plantId,
        StocktakeYear: stocktakeYear,
        StatusCode: statusCode,
        SearchKeyword: searchKeyword,
        CostCenterKeyword: costCenterKeyword,
        AssetGroupKeyword: assetGroupKeyword,
        LocationKeyword: locationKeyword,
        Month: month || undefined,
        DateFrom: dateFrom || undefined,
        DateTo: dateTo || undefined,
      }),
    [
      plantId,
      stocktakeYear,
      statusCode,
      searchKeyword,
      costCenterKeyword,
      assetGroupKeyword,
      locationKeyword,
      month,
      dateFrom,
      dateTo,
    ],
  );

  const tabs = useMemo(
    () => getMockStocktakeThreeTabs(plantId, stocktakeYear),
    [plantId, stocktakeYear],
  );
  const managementRows = useMemo(() => getMockManagementTrackingRows(), []);

  const totalBookValue = useMemo(
    () => report.details.reduce((sum, row) => sum + Number(row.CountedQty || 0), 0),
    [report.details],
  );

  return (
    <>
      <PageTitle
        title="Reports Menu (Mock)"
        subtitle="ครบเมนูเร่งด่วน: summary/detail, 3 tabs export, compare year, management tracking"
      />

      <section className="panel">
        <div className="form-grid">
          <div className="field">
            <label>Plant</label>
            <input value={plantId} onChange={(e) => setPlantId(e.target.value)} />
          </div>
          <div className="field">
            <label>Year</label>
            <input type="number" value={stocktakeYear} onChange={(e) => setStocktakeYear(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={statusCode} onChange={(e) => setStatusCode(e.target.value)}>
              <option value="ALL">ALL</option>
              <option value="COUNTED">COUNTED</option>
              <option value="NOT_COUNTED">NOT_COUNTED</option>
              <option value="PENDING">PENDING</option>
              <option value="REJECTED">REJECTED</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div className="field">
            <label>Search</label>
            <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
          </div>
          <div className="field">
            <label>Cost Center</label>
            <input value={costCenterKeyword} onChange={(e) => setCostCenterKeyword(e.target.value)} />
          </div>
          <div className="field">
            <label>Asset Group</label>
            <input value={assetGroupKeyword} onChange={(e) => setAssetGroupKeyword(e.target.value)} />
          </div>
          <div className="field">
            <label>Location</label>
            <input value={locationKeyword} onChange={(e) => setLocationKeyword(e.target.value)} />
          </div>
          <div className="field">
            <label>Month</label>
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
            />
          </div>
          <div className="field">
            <label>Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="chip-list" style={{ marginTop: 12 }}>
          <button
            className="button button--ghost"
            type="button"
            onClick={() =>
              downloadCsv(
                `stocktake-detail-${stocktakeYear}.csv`,
                rowsToCsv(
                  report.details.map((row) => ({
                    AssetNo: row.AssetNo,
                    AssetName: row.AssetName,
                    StatusCode: row.StatusCode,
                    CountMethod: row.CountMethod,
                    CountedQty: row.CountedQty,
                    CountedBy: row.CountedByName,
                    CountedAt: row.CountedAt,
                    Note: row.NoteText || "",
                  })),
                ),
              )
            }
          >
            Export Detail CSV
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={() =>
              downloadCsv(
                `stocktake-3tabs-${stocktakeYear}.csv`,
                rowsToCsv([
                  { Tab: "COUNTED", Count: tabs.counted.length },
                  { Tab: "NOT_COUNTED", Count: tabs.notCounted.length },
                  { Tab: "REJECTED", Count: tabs.rejected.length },
                ]),
              )
            }
          >
            Export 3 Tabs CSV
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="kpi-grid">
          <div className="kpi">
            <h3>Detail Rows</h3>
            <p>{report.details.length}</p>
          </div>
          <div className="kpi">
            <h3>Summary Buckets</h3>
            <p>{report.summary.length}</p>
          </div>
          <div className="kpi">
            <h3>Previous Year</h3>
            <p>{report.previousYear}</p>
          </div>
          <div className="kpi">
            <h3>Count Qty Total</h3>
            <p>{totalBookValue}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Stocktake Summary</h3>
        <div className="chip-list">
          {report.summary.map((row) => (
            <span className="chip" key={row.StatusCode}>
              {row.StatusCode}: {row.ItemCount}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Stocktake Detail</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Status</th>
                <th>Method</th>
                <th>Qty</th>
                <th>Counted By</th>
                <th>Counted At</th>
                <th>CostCenter/Location</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {report.details.map((row) => (
                <tr key={row.StocktakeRecordId}>
                  <td>
                    {row.AssetNo} - {row.AssetName}
                    <p className="muted">{row.AssetGroupName}</p>
                  </td>
                  <td>
                    <StatusChip status={row.StatusCode} />
                  </td>
                  <td>{row.CountMethod}</td>
                  <td>{row.CountedQty}</td>
                  <td>{row.CountedByName}</td>
                  <td>{formatDate(row.CountedAt)}</td>
                  <td>
                    {row.CostCenterName} / {row.LocationName}
                  </td>
                  <td>{row.NoteText || "-"}</td>
                </tr>
              ))}
              {!report.details.length ? (
                <tr>
                  <td colSpan={8}>No report rows.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>
          Compare Year ({stocktakeYear} vs {report.previousYear})
        </h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Current Year</th>
                <th>Previous Year</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {report.compareRows.map((row) => (
                <tr key={`${row.AssetNo}-${row.CurrentYearStatus}`}>
                  <td>
                    {row.AssetNo} - {row.AssetName}
                  </td>
                  <td>
                    <StatusChip status={row.CurrentYearStatus} />
                  </td>
                  <td>{row.PreviousYearStatus}</td>
                  <td>{row.NoteText}</td>
                </tr>
              ))}
              {!report.compareRows.length ? (
                <tr>
                  <td colSpan={4}>No compare rows.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Management Tracking (Demolish/Transfer)</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Request No</th>
                <th>Status</th>
                <th>Current Approver</th>
                <th>Book Value</th>
                <th>Items</th>
                <th>Created By</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {managementRows.map((row) => (
                <tr key={`${row.Type}-${row.RequestNo}`}>
                  <td>{row.Type}</td>
                  <td>{row.RequestNo}</td>
                  <td>
                    <StatusChip status={row.Status} />
                  </td>
                  <td>{row.CurrentApprover}</td>
                  <td>{formatMoney(row.TotalBookValue)}</td>
                  <td>{row.ItemCount}</td>
                  <td>{row.CreatedByName}</td>
                  <td>{formatDate(row.CreatedAt)}</td>
                </tr>
              ))}
              {!managementRows.length ? (
                <tr>
                  <td colSpan={8}>No management tracking rows.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
