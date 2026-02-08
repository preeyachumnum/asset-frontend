"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { formatMoney } from "@/lib/format";
import {
  getMockAssetMetrics,
  listMockAssets,
  resetMockAssetsStore,
} from "@/lib/mock-assets-service";

type TabType = "all" | "no-image" | "sap-gap";

export default function AssetsListPageView() {
  const [tab, setTab] = useState<TabType>(() => {
    if (typeof window === "undefined") return "all";
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam === "no-image" || tabParam === "sap-gap") return tabParam;
    return "all";
  });
  const [search, setSearch] = useState("");
  const [, setTick] = useState(0);
  const rows = listMockAssets({ mode: tab, search });
  const metrics = getMockAssetMetrics();

  const sapMismatchCount = useMemo(
    () => rows.filter((x) => !x.SapExists || Math.abs(x.BookValue - x.SapBookValue) > 0.01).length,
    [rows],
  );

  return (
    <>
      <PageTitle
        title="Asset Listings (Mock)"
        subtitle="ครบฟังก์ชันเร่งด่วน: ทั้งหมด / ไม่มีรูป / SAP gap / ค้นหา / ดูรายละเอียด"
        actions={
          <>
            <button
              className={`button ${tab === "all" ? "button--primary" : "button--ghost"}`}
              onClick={() => setTab("all")}
            >
              All
            </button>
            <button
              className={`button ${tab === "no-image" ? "button--primary" : "button--ghost"}`}
              onClick={() => setTab("no-image")}
            >
              No Image
            </button>
            <button
              className={`button ${tab === "sap-gap" ? "button--primary" : "button--ghost"}`}
              onClick={() => setTab("sap-gap")}
            >
              SAP Gap
            </button>
          </>
        }
      />

      <section className="panel">
        <div className="kpi-grid">
          <div className="kpi">
            <h3>Assets Total</h3>
            <p>{metrics.total}</p>
          </div>
          <div className="kpi">
            <h3>Assets Without Image</h3>
            <p>{metrics.noImage}</p>
          </div>
          <div className="kpi">
            <h3>SAP Data Gap</h3>
            <p>{metrics.sapGap}</p>
          </div>
          <div className="kpi">
            <h3>Rows on Screen</h3>
            <p>{rows.length}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="search">Search (AssetNo/Name/CostCenter/Location)</label>
            <input
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="e.g. 100-001 or pump"
            />
          </div>
          <div className="field">
            <label>Current Mode</label>
            <input value={tab} disabled />
          </div>
          <div className="field">
            <label>SAP Mismatch in result</label>
            <input value={sapMismatchCount} disabled />
          </div>
          <div className="field">
            <label>Reset mock data</label>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                resetMockAssetsStore();
                setTick((x) => x + 1);
              }}
            >
              Reset Assets Mock
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Asset No</th>
                <th>Name</th>
                <th>Book Value</th>
                <th>SAP Book Value</th>
                <th>Status</th>
                <th>Plant / CCA / Location</th>
                <th>Image</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((asset) => {
                const gap = !asset.SapExists || Math.abs(asset.BookValue - asset.SapBookValue) > 0.01;
                return (
                  <tr key={asset.AssetId}>
                    <td>{asset.AssetNo}</td>
                    <td>
                      <p>{asset.AssetName}</p>
                      <p className="muted">{asset.AssetGroupName}</p>
                    </td>
                    <td>{formatMoney(asset.BookValue)}</td>
                    <td>{asset.SapExists ? formatMoney(asset.SapBookValue) : "Not in SAP"}</td>
                    <td>
                      <StatusChip status={asset.StatusName || "ACTIVE"} />
                      {gap ? (
                        <p className="muted" style={{ marginTop: 4 }}>
                          SAP mismatch
                        </p>
                      ) : null}
                    </td>
                    <td>
                      <p>{asset.PlantName || "-"}</p>
                      <p className="muted">
                        {[asset.CostCenterName, asset.LocationName].filter(Boolean).join(" / ")}
                      </p>
                    </td>
                    <td>{asset.HasImage ? "Yes" : "No"}</td>
                    <td>
                      <Link className="button button--ghost" href={`/assets/${asset.AssetId}`}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={8}>No assets found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
