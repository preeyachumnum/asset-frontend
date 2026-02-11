"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PageTitle } from "@/components/page-title";
import { readSession, useSession } from "@/lib/session";

export default function ProfilePageView() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session?.sessionId) return;
    const current = readSession();
    if (!current?.sessionId) router.push("/login");
  }, [router, session?.sessionId]);

  if (!session?.sessionId) return null;

  return (
    <>
      <PageTitle
        title="Profile"
        subtitle="ข้อมูลผู้ใช้งานปัจจุบัน"
        actions={
          <Link className="button button--ghost" href="/">
            กลับหน้าแรก
          </Link>
        }
      />

      <section className="panel">
        <div className="kpi-grid">
          <div className="kpi">
            <h3>Display Name</h3>
            <p>{session.user.displayName || "-"}</p>
          </div>
          <div className="kpi">
            <h3>Email</h3>
            <p>{session.user.email || "-"}</p>
          </div>
          <div className="kpi">
            <h3>Session Expire</h3>
            <p>{session.expiresAt || "-"}</p>
          </div>
          <div className="kpi">
            <h3>Selected Plant</h3>
            <p>{session.selectedPlantId || "-"}</p>
          </div>
        </div>
      </section>
    </>
  );
}
