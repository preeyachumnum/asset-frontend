"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { ApiError, authBegin, authLogin } from "@/lib/asset-api";
import { saveSession } from "@/lib/session";
import type { PlantAccess } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plants, setPlants] = useState<PlantAccess[]>([]);
  const [plantId, setPlantId] = useState("");
  const [message, setMessage] = useState<string>("");
  const [loadingPlant, setLoadingPlant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!email.includes("@")) {
      setPlants([]);
      setPlantId("");
    }
  }, [email]);

  async function loadPlants() {
    if (!email) return;
    setLoadingPlant(true);
    setMessage("");
    try {
      const begin = await authBegin(email.trim());
      setPlants(begin.plants || []);
      setPlantId(begin.plants?.[0]?.PlantId || "");
      if (!begin.user) {
        setMessage("ไม่พบผู้ใช้งานในระบบ");
      }
    } catch (error) {
      const text = error instanceof ApiError ? error.message : "ไม่สามารถโหลดโรงงานได้";
      setMessage(text);
      setPlants([]);
      setPlantId("");
    } finally {
      setLoadingPlant(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      setMessage("กรอกอีเมลและรหัสผ่านก่อน");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await authLogin(email.trim(), password, plantId || undefined);
      saveSession({
        sessionId: response.sessionId,
        expiresAt: response.expiresAt,
        user: response.user,
        selectedPlantId: plantId || undefined,
      });
      router.push("/");
    } catch (error) {
      const text = error instanceof ApiError ? error.message : "เข้าสู่ระบบไม่สำเร็จ";
      setMessage(text);
    } finally {
      setSubmitting(false);
    }
  }

  function useDemo() {
    saveSession({
      sessionId: "demo-session",
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      user: {
        userId: "demo-user",
        email: "demo@mitrphol.com",
        displayName: "Demo User",
      },
      selectedPlantId: "demo-plant",
    });
    router.push("/");
  }

  return (
    <div className="panel login-card">
      <PageTitle
        title="Authentication"
        subtitle="ใช้บัญชี @mitrphol.com และเลือกโรงงานตามสิทธิ์จาก UserPlantAccess"
      />

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            placeholder="name@mitrphol.com"
            onChange={(event) => setEmail(event.target.value)}
            onBlur={loadPlants}
          />
        </div>

        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="plant">Plant (optional)</label>
          <select
            id="plant"
            value={plantId}
            onChange={(event) => setPlantId(event.target.value)}
            disabled={!plants.length}
          >
            {!plants.length ? <option value="">Auto select first plant</option> : null}
            {plants.map((plant) => (
              <option key={plant.PlantId} value={plant.PlantId}>
                {plant.PlantCode || plant.PlantName || plant.PlantId}
              </option>
            ))}
          </select>
        </div>

        {message ? (
          <p className="muted" style={{ marginTop: 10 }}>
            {message}
          </p>
        ) : null}

        <div className="login-actions">
          <button className="button button--primary" disabled={submitting} type="submit">
            {submitting ? "กำลังเข้าสู่ระบบ..." : "Sign in"}
          </button>
          <button
            className="button button--ghost"
            disabled={loadingPlant || submitting}
            type="button"
            onClick={loadPlants}
          >
            {loadingPlant ? "กำลังโหลด..." : "โหลดสิทธิ์โรงงาน"}
          </button>
          <button className="button button--ghost" type="button" onClick={useDemo}>
            เข้าแบบ Demo
          </button>
        </div>
      </form>
    </div>
  );
}
