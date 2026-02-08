"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { formatDate, formatMoney, truncateId } from "@/lib/format";
import {
  addMockAssetImageFiles,
  getMockAssetDetail,
  getMockAssetStatusOptions,
  updateMockAssetFields,
} from "@/lib/mock-assets-service";
import type { AssetImage, AssetView } from "@/lib/types";

export default function AssetDetailPageView() {
  const params = useParams<{ assetId: string }>();
  const assetId = params.assetId;

  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState("");

  const statusOptions = useMemo(() => getMockAssetStatusOptions(), []);
  const detail = assetId
    ? getMockAssetDetail(assetId)
    : { asset: null as AssetView | null, images: [] as AssetImage[] };
  const asset = detail.asset;
  const images = detail.images || [];

  function onSaveBasic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetId) return;
    const formData = new FormData(event.currentTarget);
    updateMockAssetFields(assetId, {
      StatusName: String(formData.get("statusName") || ""),
      CostCenterName: String(formData.get("costCenter") || ""),
      LocationName: String(formData.get("location") || ""),
      AssetGroupName: String(formData.get("groupName") || ""),
    });
    setTick((x) => x + 1);
    setMessage("บันทึกข้อมูลทรัพย์สินเรียบร้อยแล้ว");
  }

  function onUploadFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || !files.length || !assetId) return;
    addMockAssetImageFiles(
      assetId,
      Array.from(files).map((file) => file.name),
    );
    setTick((x) => x + 1);
    setMessage(`อัปโหลดรูปภาพ ${files.length} รายการเรียบร้อยแล้ว`);
  }

  return (
    <>
      <PageTitle
        title="รายละเอียดทรัพย์สิน"
        subtitle="แก้ไขสถานะ, Cost Center, Location, กลุ่มทรัพย์สิน และอัปโหลดรูปภาพได้"
        actions={
          <Link href="/assets" className="button button--ghost">
            กลับไปรายการทรัพย์สิน
          </Link>
        }
      />

      {message ? (
        <section className="panel">
          <p className="muted">{message}</p>
        </section>
      ) : null}

      <section className="panel">
        {asset ? (
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
              <label>SAP Book Value</label>
              <input value={asset.SapExists ? formatMoney(asset.SapBookValue) : "Not in SAP"} disabled />
            </div>
            <div className="field">
              <label>SAP Asset No</label>
              <input value={asset.SapAssetNo || "-"} disabled />
            </div>
            <div className="field">
              <label>Receive Date</label>
              <input value={formatDate(asset.ReceiveDate)} disabled />
            </div>
            <div className="field">
              <label>Last Counted</label>
              <input value={formatDate(asset.LastCountedAt)} disabled />
            </div>
          </div>
        ) : (
          <p>ไม่พบทรัพย์สิน</p>
        )}
      </section>

      {asset ? (
        <section className="panel">
          <h3 className="mb-2.5">แก้ไขข้อมูลทรัพย์สิน</h3>
          <form key={`${asset.AssetId}-${tick}`} onSubmit={onSaveBasic}>
            <div className="form-grid">
              <div className="field">
                <label>Status</label>
                <select name="statusName" defaultValue={asset.StatusName || ""}>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Cost Center</label>
                <input name="costCenter" defaultValue={asset.CostCenterName || ""} />
              </div>
              <div className="field">
                <label>Location</label>
                <input name="location" defaultValue={asset.LocationName || ""} />
              </div>
              <div className="field">
                <label>Asset Group</label>
                <input name="groupName" defaultValue={asset.AssetGroupName || ""} />
              </div>
            </div>
            <div className="mt-3">
              <button className="button button--primary" type="submit">
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {asset ? (
        <section className="panel">
          <h3 className="mb-2.5">รูปภาพทรัพย์สิน</h3>
          <div className="field mb-3">
            <label htmlFor="asset-images">อัปโหลดรูปภาพ</label>
            <input id="asset-images" type="file" multiple accept="image/*" onChange={onUploadFiles} />
          </div>
          {images.length ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
              {images.map((image, index) => (
                <article key={image.AssetImageId || `${image.FileUrl}-${index}`} className="panel">
                  <div
                    className="h-40 w-full rounded-xl border border-[#dce7f3] bg-center bg-cover bg-no-repeat"
                    style={{
                      backgroundImage: `url('${image.FileUrl}')`,
                    }}
                  />
                  <p className="muted mt-2">
                    {image.IsPrimary ? "รูปหลัก" : "รูปรอง"} | {formatDate(image.UploadedAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">ยังไม่มีรูปภาพ</p>
          )}
        </section>
      ) : null}
    </>
  );
}
