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
        title="รายการทรัพย์สิน"
        subtitle="ดูรายการทั้งหมด, ทรัพย์สินไม่มีรูป, ความต่างข้อมูล SAP และค้นหาได้ในหน้าเดียว"
        actions={
          <>
            <button
              className={`button ${tab === "all" ? "button--primary" : "button--ghost"}`}
              onClick={() => setTab("all")}
            >
              ทั้งหมด
            </button>
            <button
              className={`button ${tab === "no-image" ? "button--primary" : "button--ghost"}`}
              onClick={() => setTab("no-image")}
            >
              ไม่มีรูป
            </button>
            <button
              className={`button ${tab === "sap-gap" ? "button--primary" : "button--ghost"}`}
              onClick={() => setTab("sap-gap")}
            >
              ข้อมูล SAP ต่างกัน
            </button>
          </>
        }
      />

      <section className="panel">
        <div className="kpi-grid">
          <div className="kpi">
            <h3>จำนวนทรัพย์สินทั้งหมด</h3>
            <p>{metrics.total}</p>
          </div>
          <div className="kpi">
            <h3>ทรัพย์สินไม่มีรูป</h3>
            <p>{metrics.noImage}</p>
          </div>
          <div className="kpi">
            <h3>ข้อมูล SAP ไม่ตรง</h3>
            <p>{metrics.sapGap}</p>
          </div>
          <div className="kpi">
            <h3>จำนวนรายการที่แสดง</h3>
            <p>{rows.length}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="search">ค้นหา (รหัส/ชื่อ/Cost Center/Location)</label>
            <input
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="เช่น 100-001 หรือ Pump"
            />
          </div>
          <div className="field">
            <label>โหมดที่เลือก</label>
            <input value={tab} disabled />
          </div>
          <div className="field">
            <label>จำนวนที่ไม่ตรงกับ SAP</label>
            <input value={sapMismatchCount} disabled />
          </div>
          <div className="field">
            <label>รีเซ็ตข้อมูลตัวอย่าง</label>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                resetMockAssetsStore();
                setTick((x) => x + 1);
              }}
            >
              รีเซ็ตข้อมูลทรัพย์สิน
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
                <th>ชื่อทรัพย์สิน</th>
                <th>Book Value</th>
                <th>Book Value (SAP)</th>
                <th>สถานะ</th>
                <th>Plant / CCA / Location</th>
                <th>รูปภาพ</th>
                <th>การทำงาน</th>
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
                    <td>{asset.SapExists ? formatMoney(asset.SapBookValue) : "ไม่พบใน SAP"}</td>
                    <td>
                      <StatusChip status={asset.StatusName || "ACTIVE"} />
                      {gap ? (
                        <p className="muted mt-1">
                          ข้อมูล SAP ไม่ตรง
                        </p>
                      ) : null}
                    </td>
                    <td>
                      <p>{asset.PlantName || "-"}</p>
                      <p className="muted">
                        {[asset.CostCenterName, asset.LocationName].filter(Boolean).join(" / ")}
                      </p>
                    </td>
                    <td>{asset.HasImage ? "มี" : "ไม่มี"}</td>
                    <td>
                      <Link className="button button--ghost" href={`/assets/${asset.AssetId}`}>
                        รายละเอียด
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={8}>ไม่พบรายการทรัพย์สิน</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
