"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { ApiError, getAssets, getAssetsNoImage, getAssetsSapMismatch } from "@/lib/asset-api";
import { formatMoney } from "@/lib/format";
import { readSession } from "@/lib/session";
import type { AssetRow, AssetSapMismatchRow } from "@/lib/types";

type TabType = "all" | "no-image" | "sap-gap";

function asNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function assetSearchText(row: AssetRow) {
  return [
    row.AssetNo,
    row.AssetName,
    row.PlantId,
    row.CostCenterId,
    row.LocationId,
    row.AssetStatusId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function mismatchSearchText(row: AssetSapMismatchRow) {
  return [
    row.AssetNo,
    row.AssetName,
    row.SapAssetName,
    row.AssetPlantCode,
    row.SapPlantCode,
    row.AssetCostCenterCode,
    row.SapCostCenterCode,
    row.MismatchType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function AssetsListPageView() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const [allRows, setAllRows] = useState<AssetRow[]>([]);
  const [noImageRows, setNoImageRows] = useState<AssetRow[]>([]);
  const [sapGapRows, setSapGapRows] = useState<AssetSapMismatchRow[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam === "no-image" || tabParam === "sap-gap") {
      setTab(tabParam);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = readSession();
      if (!session?.sessionId) {
        router.push("/login");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [all, noImage, sapGap] = await Promise.all([
          getAssets(session.sessionId),
          getAssetsNoImage(session.sessionId),
          getAssetsSapMismatch(session.sessionId, { limit: 5000 }),
        ]);

        if (cancelled) return;
        setAllRows(all);
        setNoImageRows(noImage);
        setSapGapRows(sapGap);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load assets";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router, refreshTick]);

  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((x) => assetSearchText(x).includes(q));
  }, [allRows, search]);

  const filteredNoImage = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return noImageRows;
    return noImageRows.filter((x) => assetSearchText(x).includes(q));
  }, [noImageRows, search]);

  const filteredSapGap = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sapGapRows;
    return sapGapRows.filter((x) => mismatchSearchText(x).includes(q));
  }, [sapGapRows, search]);

  const mismatchCount = sapGapRows.length;
  const rowsShown =
    tab === "all"
      ? filteredAll.length
      : tab === "no-image"
        ? filteredNoImage.length
        : filteredSapGap.length;

  return (
    <>
      <PageTitle
        title="รายการทรัพย์สิน"
        subtitle="ครอบคลุมรายการทั้งหมด, รายการไม่มีรูป และรายการที่ข้อมูล SAP ไม่ตรงกับระบบ"
        actions={
          <>
            <button
              className={`button ${tab === "all" ? "button--primary" : "button--ghost"}`}
              onClick={() => setTab("all")}
              type="button"
            >
              ทั้งหมด
            </button>
            <button
              className={`button ${tab === "no-image" ? "button--primary" : "button--ghost"}`}
              onClick={() => setTab("no-image")}
              type="button"
            >
              ไม่มีรูป
            </button>
            <button
              className={`button ${tab === "sap-gap" ? "button--primary" : "button--ghost"}`}
              onClick={() => setTab("sap-gap")}
              type="button"
            >
              SAP mismatch
            </button>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => setRefreshTick((x) => x + 1)}
            >
              Refresh
            </button>
          </>
        }
      />

      <section className="panel">
        <div className="kpi-grid">
          <div className="kpi">
            <h3>สินทรัพย์ทั้งหมด</h3>
            <p>{allRows.length}</p>
          </div>
          <div className="kpi">
            <h3>ไม่มีรูป</h3>
            <p>{noImageRows.length}</p>
          </div>
          <div className="kpi">
            <h3>SAP mismatch</h3>
            <p>{mismatchCount}</p>
          </div>
          <div className="kpi">
            <h3>แสดงผล</h3>
            <p>{rowsShown}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="search">ค้นหา</label>
            <input
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Asset no / name / cost center / plant"
            />
          </div>
          <div className="field">
            <label>โหมด</label>
            <input value={tab} disabled />
          </div>
        </div>
      </section>

      {error ? (
        <section className="panel">
          <p className="muted">{error}</p>
        </section>
      ) : null}

      {loading ? (
        <section className="panel">
          <p className="muted">Loading...</p>
        </section>
      ) : null}

      {!loading && tab !== "sap-gap" ? (
        <section className="panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset No</th>
                  <th>Asset Name</th>
                  <th>Book Value</th>
                  <th>Status</th>
                  <th>Plant / CostCenter / Location</th>
                  <th>Image</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(tab === "all" ? filteredAll : filteredNoImage).map((asset) => (
                  <tr key={asset.AssetId}>
                    <td>{asset.AssetNo}</td>
                    <td>{asset.AssetName}</td>
                    <td>{formatMoney(asset.BookValue)}</td>
                    <td>
                      <StatusChip status={asset.IsActive === false ? "INACTIVE" : "ACTIVE"} />
                    </td>
                    <td>
                      {[
                        asset.PlantId || "-",
                        asset.CostCenterId || "-",
                        asset.LocationId || "-",
                      ].join(" / ")}
                    </td>
                    <td>{tab === "no-image" ? "No image" : "-"}</td>
                    <td>
                      <Link className="button button--ghost" href={`/assets/${asset.AssetId}`}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
                {(tab === "all" ? filteredAll : filteredNoImage).length === 0 ? (
                  <tr>
                    <td colSpan={7}>No assets found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!loading && tab === "sap-gap" ? (
        <section className="panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset No</th>
                  <th>Mismatch Type</th>
                  <th>Asset Name / SAP Name</th>
                  <th>Book Value / SAP</th>
                  <th>Plant / SAP</th>
                  <th>Cost Center / SAP</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSapGap.map((row, idx) => (
                  <tr key={`${row.AssetNo}-${row.MismatchType}-${idx}`}>
                    <td>{row.AssetNo}</td>
                    <td>
                      <StatusChip status={row.MismatchType} />
                    </td>
                    <td>
                      <p>{row.AssetName || "-"}</p>
                      <p className="muted">{row.SapAssetName || "-"}</p>
                    </td>
                    <td>
                      {formatMoney(asNumber(row.AssetBookValue))}
                      <p className="muted">{formatMoney(asNumber(row.SapBookValue))}</p>
                    </td>
                    <td>
                      {row.AssetPlantCode || "-"}
                      <p className="muted">{row.SapPlantCode || "-"}</p>
                    </td>
                    <td>
                      {row.AssetCostCenterCode || "-"}
                      <p className="muted">{row.SapCostCenterCode || "-"}</p>
                    </td>
                    <td>
                      {row.AssetId ? (
                        <Link className="button button--ghost" href={`/assets/${row.AssetId}`}>
                          Detail
                        </Link>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredSapGap.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No SAP mismatch rows.</td>
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
