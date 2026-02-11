"use client";

import Link from "next/link";

import { PageTitle } from "@/components/page-title";
import { approvalFlows } from "@/lib/mock-data";
import { useSession } from "@/lib/session";

type ModuleCard = {
  title: string;
  subtitle: string;
  headClass: string;
  links: Array<{ label: string; href: string }>;
};

const moduleCards: ModuleCard[] = [
  {
    title: "ASSET LISTINGS",
    subtitle: "รายการทรัพย์สิน",
    headClass: "bg-gradient-to-br from-[#1A5E97] to-[#143D62]",
    links: [
      { label: "รายการทรัพย์สินทั้งหมด", href: "/assets" },
      { label: "ทรัพย์สินที่ไม่มีรูปภาพ", href: "/assets?tab=no-image" },
      { label: "กรอง/ค้นหา", href: "/assets" },
    ],
  },
  {
    title: "ASSET INVENTORY COUNT",
    subtitle: "การตรวจนับทรัพย์สิน",
    headClass: "bg-gradient-to-br from-[#E88D2F] to-[#CF6510]",
    links: [
      { label: "รหัส QR", href: "/stocktake" },
      { label: "ตรรกะการนับ", href: "/stocktake" },
      { label: "สถานะทรัพย์สิน 12 สถานะ", href: "/stocktake" },
    ],
  },
  {
    title: "ASSET MANAGEMENT",
    subtitle: "การจัดการทรัพย์สิน",
    headClass: "bg-gradient-to-br from-[#4A4A95] to-[#2D2E66]",
    links: [
      { label: "การตัดบัญชี (Demolish)", href: "/demolish" },
      { label: "การโอนย้าย (Transfer)", href: "/transfer" },
    ],
  },
  {
    title: "USER ROLES",
    subtitle: "บทบาทผู้ใช้งาน",
    headClass: "bg-gradient-to-br from-[#6A859D] to-[#4D667A]",
    links: [
      { label: "ผู้ร้องขอ", href: "/roles" },
      { label: "เจ้าของทรัพย์สิน", href: "/roles" },
      { label: "ผอ.บัญชีกลาง / CEO / นักบัญชี", href: "/roles" },
    ],
  },
];

export default function Home() {
  const session = useSession();
  const isLoggedIn = Boolean(session?.sessionId);
  const profileLabel = session?.user.displayName || session?.user.email || "Profile";

  return (
    <div className="dashboard-layout">
      <PageTitle
        title="T-Asset for Accounting"
        subtitle="ภาพรวมการทำงานหลักของระบบทรัพย์สิน"
        actions={
          <>
            {isLoggedIn ? (
              <Link href="/profile" className="button button--ghost" title={profileLabel}>
                Profile
              </Link>
            ) : (
              <Link href="/login" className="button button--ghost">
                เข้าสู่ระบบ
              </Link>
            )}
            <Link href="/assets" className="button button--primary">
              เริ่มใช้งาน
            </Link>
          </>
        }
      />

      <section className="dashboard-top-cards">
        {moduleCards.map((card) => (
          <article key={card.title} className="dashboard-card">
            <div className={`dashboard-card-head ${card.headClass}`}>
              <h3>{card.title}</h3>
              <p>{card.subtitle}</p>
            </div>
            <div className="dashboard-card-body">
              {card.links.map((item) => (
                <Link key={item.label} className="dashboard-menu-pill" href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-approval-box">
          <h2>Approval Flow</h2>
          <div className="dashboard-approval-split">
            {approvalFlows.map((flow) => (
              <div key={flow.title} className="dashboard-lane">
                <span className="dashboard-lane-title">{flow.title}</span>
                <p className="muted">{flow.condition}</p>
                <div className="dashboard-steps">
                  {flow.steps.map((step, index) => (
                    <div key={step} className="dashboard-steps">
                      <span className="dashboard-step">{step}</span>
                      {index < flow.steps.length - 1 ? (
                        <span className="dashboard-arrow">-&gt;</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="dashboard-stack-right">
          <article className="panel">
            <h3 className="mb-2.5">User Roles</h3>
            <div className="dashboard-role-grid">
              <div className="dashboard-role-chip">ผู้ร้องขอ</div>
              <div className="dashboard-role-chip">เจ้าของทรัพย์สิน</div>
              <div className="dashboard-role-chip">ผอ. บัญชีกลาง</div>
              <div className="dashboard-role-chip">CEO</div>
              <div className="dashboard-role-chip">นักบัญชี</div>
              <div className="dashboard-role-chip">Admin (IT)</div>
            </div>
          </article>

          <article className="dashboard-sync-box">
            <h3>Auto Sync SAP</h3>
            <p className="muted">ซิงค์รายการทุกคืนตามคิวจาก `SapSyncOutbox`</p>
            <p className="dashboard-sync-time">00:00</p>
          </article>
        </div>
      </section>
    </div>
  );
}
