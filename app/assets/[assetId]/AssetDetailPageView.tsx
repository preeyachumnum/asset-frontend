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
    setMessage("Saved asset fields.");
  }

  function onUploadFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || !files.length || !assetId) return;
    addMockAssetImageFiles(
      assetId,
      Array.from(files).map((file) => file.name),
    );
    setTick((x) => x + 1);
    setMessage(`Uploaded ${files.length} image(s).`);
  }

  return (
    <>
      <PageTitle
        title="Asset Detail (Mock)"
        subtitle="แก้สถานะ/CCA/Location/Group และเพิ่มรูปภาพได้"
        actions={
          <Link href="/assets" className="button button--ghost">
            Back to Assets
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
          <p>Asset not found.</p>
        )}
      </section>

      {asset ? (
        <section className="panel">
          <h3 style={{ marginBottom: 10 }}>Update Asset Fields</h3>
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
            <div style={{ marginTop: 12 }}>
              <button className="button button--primary" type="submit">
                Save Changes
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {asset ? (
        <section className="panel">
          <h3 style={{ marginBottom: 10 }}>Asset Images</h3>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="asset-images">Upload images (mock)</label>
            <input id="asset-images" type="file" multiple accept="image/*" onChange={onUploadFiles} />
          </div>
          {images.length ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              }}
            >
              {images.map((image, index) => (
                <article key={image.AssetImageId || `${image.FileUrl}-${index}`} className="panel">
                  <div
                    style={{
                      width: "100%",
                      height: 160,
                      borderRadius: 12,
                      border: "1px solid #dce7f3",
                      background: `url('${image.FileUrl}') center/cover no-repeat`,
                    }}
                  />
                  <p className="muted" style={{ marginTop: 8 }}>
                    {image.IsPrimary ? "Primary" : "Secondary"} | {formatDate(image.UploadedAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No images yet.</p>
          )}
        </section>
      ) : null}
    </>
  );
}
