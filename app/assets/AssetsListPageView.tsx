"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { StatusChip } from "@/components/status-chip";
import { ApiError, getAssets, getAssetsNoImage, getAssetsSapMismatch } from "@/lib/asset-api";
import { formatMoney } from "@/lib/format";
import { clearSession, readSession, useHydrated, useSession } from "@/lib/session";
import type { AssetRow, AssetSapMismatchRow, PagingMeta } from "@/lib/types";

type TabType = "all" | "no-image" | "sap-gap";

type TabRows = {
  all: AssetRow[];
  "no-image": AssetRow[];
  "sap-gap": AssetSapMismatchRow[];
};

type TabPaging = {
  all: PagingMeta;
  "no-image": PagingMeta;
  "sap-gap": PagingMeta;
};

type TabLoaded = Record<TabType, boolean>;
type TabPages = Record<TabType, number>;

const EMPTY_PAGING: PagingMeta = {
  page: 1,
  pageSize: 50,
  totalRows: 0,
  totalPages: 0,
};

function asNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function codeName(code?: string | null, name?: string | null) {
  const c = String(code || "").trim();
  const n = String(name || "").trim();
  if (c && n && c !== n) return `${c} (${n})`;
  if (c) return c;
  if (n) return n;
  return "-";
}

function toBool(v: unknown) {
  if (typeof v === "boolean") return v;
  const n = Number(v);
  if (Number.isFinite(n)) return n > 0;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function hasImage(asset: AssetRow, tab: TabType) {
  if (tab === "no-image") return false;
  return toBool(asset.HasImage);
}

export default function AssetsListPageView() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [pages, setPages] = useState<TabPages>({
    all: 1,
    "no-image": 1,
    "sap-gap": 1,
  });

  const [rowsByTab, setRowsByTab] = useState<TabRows>({
    all: [],
    "no-image": [],
    "sap-gap": [],
  });

  const [pagingByTab, setPagingByTab] = useState<TabPaging>({
    all: EMPTY_PAGING,
    "no-image": EMPTY_PAGING,
    "sap-gap": EMPTY_PAGING,
  });

  const [loadedByTab, setLoadedByTab] = useState<TabLoaded>({
    all: false,
    "no-image": false,
    "sap-gap": false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam === "no-image" || tabParam === "sap-gap") {
      setTab(tabParam);
    }
  }, []);

  const session = useSession();
  const hydrated = useHydrated();
  const effectiveSessionId = useMemo(() => {
    if (!hydrated) return "";
    const fromHook = String(session?.sessionId || "").trim();
    if (fromHook) return fromHook;
    return String(readSession()?.sessionId || "").trim();
  }, [hydrated, session?.sessionId]);

  useEffect(() => {
    if (!hydrated) return;
    if (effectiveSessionId) return;
    clearSession();
    router.replace("/login");
  }, [effectiveSessionId, hydrated, router]);

  const currentPage = pages[tab];

  useEffect(() => {
    if (!hydrated || !effectiveSessionId) return;
    const sid = effectiveSessionId;

    let cancelled = false;

    async function loadCurrentTab() {
      setLoading(true);
      setError("");

      try {
        if (tab === "all") {
          const response = await getAssets(sid, {
            page: currentPage,
            pageSize,
            search: searchTerm,
          });

          if (cancelled) return;
          setRowsByTab((prev) => ({ ...prev, all: response.rows }));
          setPagingByTab((prev) => ({ ...prev, all: response.paging }));
          setLoadedByTab((prev) => ({ ...prev, all: true }));
          return;
        }

        if (tab === "no-image") {
          const response = await getAssetsNoImage(sid, {
            page: currentPage,
            pageSize,
            search: searchTerm,
          });

          if (cancelled) return;
          setRowsByTab((prev) => ({ ...prev, "no-image": response.rows }));
          setPagingByTab((prev) => ({ ...prev, "no-image": response.paging }));
          setLoadedByTab((prev) => ({ ...prev, "no-image": true }));
          return;
        }

        const response = await getAssetsSapMismatch(sid, {
          page: currentPage,
          pageSize,
          search: searchTerm,
        });

        if (cancelled) return;
        setRowsByTab((prev) => ({ ...prev, "sap-gap": response.rows }));
        setPagingByTab((prev) => ({ ...prev, "sap-gap": response.paging }));
        setLoadedByTab((prev) => ({ ...prev, "sap-gap": true }));
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          clearSession();
          setError("Invalid or expired session.");
          router.replace("/login");
          return;
        }
        const msg = e instanceof ApiError ? e.message : "Failed to load assets";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCurrentTab();

    return () => {
      cancelled = true;
    };
  }, [currentPage, effectiveSessionId, hydrated, pageSize, router, searchTerm, tab]);

  const currentRows = useMemo(() => {
    if (tab === "all") return rowsByTab.all;
    if (tab === "no-image") return rowsByTab["no-image"];
    return rowsByTab["sap-gap"];
  }, [rowsByTab, tab]);

  const currentPaging = pagingByTab[tab];
  const hasPrev = currentPage > 1;
  const hasNext = currentPaging.totalPages > currentPage;

  function onSubmitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPages((prev) => ({ ...prev, [tab]: 1 }));
    setSearchTerm(searchInput.trim());
  }

  function onChangePage(nextPage: number) {
    setPages((prev) => ({ ...prev, [tab]: nextPage }));
  }

  function onChangeTab(nextTab: TabType) {
    setTab(nextTab);
  }

  function onChangePageSize(nextSize: number) {
    setPageSize(nextSize);
    setPages({ all: 1, "no-image": 1, "sap-gap": 1 });
  }

  return (
    <>
      <PageTitle
        title="รายการทรัพย์สิน"
        subtitle="โหลดข้อมูลแบบแบ่งหน้า (Pagination)"
        actions={
          <>
            <button
              className={`button ${tab === "all" ? "button--primary" : "button--ghost"}`}
              onClick={() => onChangeTab("all")}
              type="button"
            >
              ทั้งหมด
            </button>
            <button
              className={`button ${tab === "no-image" ? "button--primary" : "button--ghost"}`}
              onClick={() => onChangeTab("no-image")}
              type="button"
            >
              ไม่มีรูป
            </button>
            <button
              className={`button ${tab === "sap-gap" ? "button--primary" : "button--ghost"}`}
              onClick={() => onChangeTab("sap-gap")}
              type="button"
            >
              SAP mismatch
            </button>
          </>
        }
      />

      <section className="panel">
        <div className="kpi-grid">
          <div className="kpi">
            <h3>สินทรัพย์ทั้งหมด</h3>
            <p>{loadedByTab.all ? pagingByTab.all.totalRows : "-"}</p>
          </div>
          <div className="kpi">
            <h3>ไม่มีรูป</h3>
            <p>{loadedByTab["no-image"] ? pagingByTab["no-image"].totalRows : "-"}</p>
          </div>
          <div className="kpi">
            <h3>SAP mismatch</h3>
            <p>{loadedByTab["sap-gap"] ? pagingByTab["sap-gap"].totalRows : "-"}</p>
          </div>
          <div className="kpi">
            <h3>หน้า</h3>
            <p>{currentPaging.totalPages > 0 ? `${currentPage}/${currentPaging.totalPages}` : "-"}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <form className="form-grid" onSubmit={onSubmitSearch}>
          <div className="field">
            <label htmlFor="search">ค้นหา</label>
            <input
              id="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Asset no / name"
            />
          </div>

          <div className="field">
            <label htmlFor="mode">โหมด</label>
            <input id="mode" value={tab} disabled />
          </div>

          <div className="field">
            <label htmlFor="pageSize">ต่อหน้า</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(event) => onChangePageSize(Number(event.target.value))}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button className="button button--primary" type="submit">
              ค้นหา
            </button>
          </div>
        </form>
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
                {(currentRows as AssetRow[]).map((asset) => (
                  <tr key={asset.AssetId}>
                    <td>{asset.AssetNo}</td>
                    <td>{asset.AssetName}</td>
                    <td>{formatMoney(asset.BookValue)}</td>
                    <td>
                      <StatusChip status={asset.IsActive === false ? "INACTIVE" : "ACTIVE"} />
                    </td>
                    <td>
                      {[
                        codeName(asset.PlantCode, asset.PlantName),
                        codeName(asset.CostCenterCode, asset.CostCenterName),
                        codeName(asset.LocationCode, asset.LocationName),
                      ].join(" / ")}
                    </td>
                    <td>
                      {hasImage(asset, tab) ? (
                        <span className="status-chip status-chip--positive">มีรูป</span>
                      ) : (
                        <span className="status-chip status-chip--neutral">ไม่มีรูป</span>
                      )}
                    </td>
                    <td>
                      <Link className="button button--ghost" href={`/assets/${asset.AssetId}`}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
                {currentRows.length === 0 ? (
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
                {(currentRows as AssetSapMismatchRow[]).map((row, idx) => (
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
                {currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No SAP mismatch rows.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="page-head__actions">
          <button
            className="button button--ghost"
            disabled={!hasPrev || loading}
            onClick={() => onChangePage(currentPage - 1)}
            type="button"
          >
            ก่อนหน้า
          </button>
          <button
            className="button button--ghost"
            disabled={!hasNext || loading}
            onClick={() => onChangePage(currentPage + 1)}
            type="button"
          >
            ถัดไป
          </button>
        </div>
      </section>
    </>
  );
}
