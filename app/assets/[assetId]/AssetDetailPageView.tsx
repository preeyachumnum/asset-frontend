"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { UploadFileControl } from "@/components/upload-file-control";
import { ApiError, getAssetDetail, toApiFileUrl, uploadAssetImage } from "@/lib/asset-api";
import { formatDate, formatMoney } from "@/lib/format";
import { clearSession, readSession, useHydrated, useSession } from "@/lib/session";
import type { AssetImage, AssetRow } from "@/lib/types";

type DetailState = {
  asset: AssetRow | null;
  images: AssetImage[];
};

function codeName(code?: string | null, name?: string | null) {
  const c = String(code || "").trim();
  const n = String(name || "").trim();
  if (c && n && c !== n) return `${c} (${n})`;
  if (c) return c;
  if (n) return n;
  return "-";
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AssetDetailPageView() {
  const params = useParams<{ assetId: string }>();
  const router = useRouter();
  const assetId = params.assetId;
  const session = useSession();
  const hydrated = useHydrated();
  const effectiveSessionId = useMemo(() => {
    if (!hydrated) return "";
    const fromHook = String(session?.sessionId || "").trim();
    if (fromHook) return fromHook;
    return String(readSession()?.sessionId || "").trim();
  }, [hydrated, session?.sessionId]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [detail, setDetail] = useState<DetailState>({ asset: null, images: [] });

  useEffect(() => {
    if (!hydrated) return;
    if (effectiveSessionId) return;
    clearSession();
    router.replace("/login");
  }, [effectiveSessionId, hydrated, router]);

  const loadDetail = useCallback(
    async (sid: string) => {
      setLoading(true);
      setError("");
      try {
        const r = await getAssetDetail(sid, assetId);
        setDetail({ asset: r.asset, images: r.images || [] });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          clearSession();
          setError("Invalid or expired session.");
          router.replace("/login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "Failed to load asset detail");
      } finally {
        setLoading(false);
      }
    },
    [assetId, router]
  );

  useEffect(() => {
    if (!assetId || !hydrated || !effectiveSessionId) return;
    loadDetail(effectiveSessionId);
  }, [assetId, effectiveSessionId, hydrated, loadDetail]);

  async function onUpload() {
    if (!hydrated || !effectiveSessionId) return;
    if (!selectedFile) {
      setUploadMessage("กรุณาเลือกไฟล์รูปก่อน");
      return;
    }

    setUploading(true);
    setUploadMessage("");
    try {
      await uploadAssetImage(effectiveSessionId, assetId, selectedFile, { isPrimary });
      setUploadMessage("อัปโหลดรูปสำเร็จ");
      setSelectedFile(null);
      setIsPrimary(false);
      await loadDetail(effectiveSessionId);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        setUploadMessage("Invalid or expired session.");
        router.replace("/login");
        return;
      }
      setUploadMessage(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const asset = detail.asset;
  const images = detail.images;
  const selectedFileLabel = selectedFile
    ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
    : "ยังไม่ได้เลือกไฟล์";

  return (
    <>
      <PageTitle
        title="รายละเอียดทรัพย์สิน"
        subtitle="ดูข้อมูลทรัพย์สินและจัดการรูปภาพ"
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
              <label>Status</label>
              <input value={codeName(asset.StatusCode, asset.StatusName)} disabled />
            </div>
            <div className="field">
              <label>Company</label>
              <input value={codeName(asset.CompanyCode, asset.CompanyName)} disabled />
            </div>
            <div className="field">
              <label>Plant</label>
              <input value={codeName(asset.PlantCode, asset.PlantName)} disabled />
            </div>
            <div className="field">
              <label>Cost Center</label>
              <input value={codeName(asset.CostCenterCode, asset.CostCenterName)} disabled />
            </div>
            <div className="field">
              <label>Location</label>
              <input value={codeName(asset.LocationCode, asset.LocationName)} disabled />
            </div>
            <div className="field">
              <label>QR Value</label>
              <input value={asset.QrValue || "-"} disabled />
            </div>
            <div className="field">
              <label>QR Type</label>
              <input value={asset.QrTypeCode || "-"} disabled />
            </div>
          </div>
        </section>
      ) : null}

      {!loading && asset ? (
        <section className="panel">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-[#1f4f78]">อัปโหลดรูปภาพ</h3>
            <p className="muted mt-1 text-sm">Primary image คือรูปหลักที่แสดงเป็นรูปแรกของทรัพย์สิน</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-center">
            <UploadFileControl
              id="asset-image"
              label="เลือกไฟล์รูป"
              fileLabel={selectedFileLabel}
              accept="image/*"
              buttonText="เลือกไฟล์"
              helperText="รองรับไฟล์ JPG, PNG, WEBP"
              onFileChange={(file) => {
                setSelectedFile(file);
                setUploadMessage("");
              }}
            />

            <label className="inline-flex cursor-pointer items-center rounded-xl border border-[#d4e2f0] bg-white px-3 py-3">
              <input
                checked={isPrimary}
                onChange={(event) => setIsPrimary(event.target.checked)}
                type="checkbox"
                className="peer sr-only"
              />
              <div className="relative h-6 w-11 rounded-full bg-[#c9d9e8] transition peer-checked:bg-[#1d74b7] peer-focus:ring-2 peer-focus:ring-[#6aa3d340]">
                <span
                  className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
                />
              </div>
              <span className="ml-3 text-sm font-semibold text-[#2f5476]">ตั้งเป็นรูปหลัก</span>
            </label>

            <button
              className="button button--primary h-11 w-full min-w-[160px] lg:w-auto"
              disabled={uploading || !selectedFile}
              onClick={onUpload}
              type="button"
            >
              {uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
            </button>
          </div>

          {uploadMessage ? <p className="muted mt-2">{uploadMessage}</p> : null}
        </section>
      ) : null}

      {!loading && asset ? (
        <section className="panel">
          <div className="asset-gallery-simple-head">
            <h3>รูปภาพทรัพย์สิน</h3>
            <span className="chip">{images.length} รูป</span>
          </div>

          {images.length ? (
            <div className="asset-gallery-simple-grid">
              {images.map((image, index) => {
                const imageUrl = toApiFileUrl(image.FileUrl);
                return (
                  <article key={image.AssetImageId || `${image.FileUrl}-${index}`} className="asset-photo-card">
                    <a href={imageUrl} rel="noreferrer" target="_blank" title="เปิดรูปขนาดเต็ม">
                      <img alt={`Asset image ${index + 1}`} loading="lazy" src={imageUrl} className="asset-photo" />
                    </a>
                    <div className="asset-photo-meta">
                      <span className={image.IsPrimary ? "status-chip status-chip--positive" : "status-chip status-chip--neutral"}>
                        {image.IsPrimary ? "รูปหลัก" : "รูปย่อย"}
                      </span>
                      <span className="muted">{formatDate(image.UploadedAt)}</span>
                    </div>
                  </article>
                );
              })}
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
