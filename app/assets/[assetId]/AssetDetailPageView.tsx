"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { ApiError, getAssetDetail } from "@/lib/asset-api";
import { formatDate, formatMoney, truncateId } from "@/lib/format";
import { readSession } from "@/lib/session";
import type { AssetImage, AssetRow } from "@/lib/types";

type DetailState = {
  asset: AssetRow | null;
  images: AssetImage[];
};

export default function AssetDetailPageView() {
  const params = useParams<{ assetId: string }>();
  const router = useRouter();
  const assetId = params.assetId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<DetailState>({ asset: null, images: [] });

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
        const r = await getAssetDetail(session.sessionId, assetId);
        if (cancelled) return;
        setDetail({ asset: r.asset, images: r.images || [] });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Failed to load asset detail");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (assetId) {
      load();
    }
    return () => {
      cancelled = true;
    };
  }, [assetId, router]);

  const asset = detail.asset;
  const images = detail.images;

  return (
    <>
      <PageTitle
        title="รายละเอียดทรัพย์สิน"
        subtitle="ข้อมูลจาก API จริง"
        actions={
          <Link href="/assets" className="button button--ghost">
            กลับไปหน้ารายการ
          </Link>
        }
      />

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

      {!loading && asset ? (
        <section className="panel">
          <div className="form-grid">
            <div className="field">
              <label>AssetId</label>
              <input value={truncateId(asset.AssetId, 10, 8)} disabled />
            </div>
            <div className="field">
              <label>Asset No</label>
              <input value={asset.AssetNo} disabled />
            </div>
            <div className="field">
              <label>Asset Name</label>
              <input value={asset.AssetName} disabled />
            </div>
            <div className="field">
              <label>Book Value</label>
              <input value={formatMoney(asset.BookValue)} disabled />
            </div>
            <div className="field">
              <label>Receive Date</label>
              <input value={formatDate(asset.ReceiveDate)} disabled />
            </div>
            <div className="field">
              <label>QR Value</label>
              <input value={asset.QrValue || "-"} disabled />
            </div>
            <div className="field">
              <label>Plant / CostCenter / Location</label>
              <input
                value={[asset.PlantId || "-", asset.CostCenterId || "-", asset.LocationId || "-"].join(" / ")}
                disabled
              />
            </div>
            <div className="field">
              <label>Status</label>
              <input value={asset.IsActive === false ? "INACTIVE" : "ACTIVE"} disabled />
            </div>
          </div>
        </section>
      ) : null}

      {!loading && asset ? (
        <section className="panel">
          <h3 className="mb-2.5">รูปภาพทรัพย์สิน</h3>
          {images.length ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
              {images.map((image, index) => (
                <article key={image.AssetImageId || `${image.FileUrl}-${index}`} className="panel">
                  <div
                    className="h-40 w-full rounded-xl border border-[#dce7f3] bg-center bg-cover bg-no-repeat"
                    style={{ backgroundImage: `url('${image.FileUrl}')` }}
                  />
                  <p className="muted mt-2">
                    {image.IsPrimary ? "Primary" : "Secondary"} | {formatDate(image.UploadedAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">ไม่พบรูปภาพ</p>
          )}
        </section>
      ) : null}

      {!loading && !asset && !error ? (
        <section className="panel">
          <p className="muted">ไม่พบทรัพย์สิน</p>
        </section>
      ) : null}
    </>
  );
}
