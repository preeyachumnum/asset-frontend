import Link from "next/link";

import { PageTitle } from "@/components/page-title";
import { approvalFlows } from "@/lib/mock-data";
import styles from "./page.module.css";

const moduleCards = [
  {
    title: "ASSET LISTINGS",
    subtitle: "รายการทรัพย์สิน",
    color: "linear-gradient(135deg, #1A5E97 0%, #143D62 100%)",
    links: [
      { label: "รายการทรัพย์สินทั้งหมด", href: "/assets" },
      { label: "ทรัพย์สินที่ไม่มีรูปภาพ", href: "/assets?tab=no-image" },
      { label: "กรอง/ค้นหา", href: "/assets" },
    ],
  },
  {
    title: "ASSET INVENTORY COUNT",
    subtitle: "การตรวจนับทรัพย์สิน",
    color: "linear-gradient(135deg, #E88D2F 0%, #CF6510 100%)",
    links: [
      { label: "รหัส QR", href: "/stocktake" },
      { label: "ตรรกะการนับ", href: "/stocktake" },
      { label: "สถานะทรัพย์สิน 12 สถานะ", href: "/stocktake" },
    ],
  },
  {
    title: "ASSET MANAGEMENT",
    subtitle: "การจัดการทรัพย์สิน",
    color: "linear-gradient(135deg, #4A4A95 0%, #2D2E66 100%)",
    links: [
      { label: "การตัดบัญชี (Demolish)", href: "/demolish" },
      { label: "การโอนย้าย (Transfer)", href: "/transfer" },
    ],
  },
  {
    title: "User Roles",
    subtitle: "บทบาทผู้ใช้งาน",
    color: "linear-gradient(135deg, #6A859D 0%, #4D667A 100%)",
    links: [
      { label: "ผู้ร้องขอ", href: "/roles" },
      { label: "เจ้าของทรัพย์สิน", href: "/roles" },
      { label: "ผอ. บัญชีกลาง / CEO / นักบัญชี", href: "/roles" },
    ],
  },
];

export default function Home() {
  return (
    <div className={styles.layout}>
      <PageTitle
        title="T-Asset for Accounting"
        subtitle="Dashboard ที่สร้างจาก easset requirement + OverAllDB.sql"
        actions={
          <>
            <Link href="/login" className="button button--ghost">
              เข้าสู่ระบบ
            </Link>
            <Link href="/assets" className="button button--primary">
              เริ่มใช้งาน
            </Link>
          </>
        }
      />

      <section className={styles.topCards}>
        {moduleCards.map((card) => (
          <article key={card.title} className={styles.card}>
            <div className={styles.cardHead} style={{ background: card.color }}>
              <h3>{card.title}</h3>
              <p>{card.subtitle}</p>
            </div>
            <div className={styles.cardBody}>
              {card.links.map((item) => (
                <Link key={item.label} className={styles.menuPill} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.mainGrid}>
        <article className={styles.approvalBox}>
          <h2>Approval Flow</h2>
          <div className={styles.approvalSplit}>
            {approvalFlows.map((flow) => (
              <div key={flow.title} className={styles.lane}>
                <span className={styles.laneTitle}>{flow.title}</span>
                <p className="muted">{flow.condition}</p>
                <div className={styles.steps}>
                  {flow.steps.map((step, index) => (
                    <div key={step} className={styles.steps}>
                      <span className={styles.step}>{step}</span>
                      {index < flow.steps.length - 1 ? (
                        <span className={styles.arrow}>→</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className={styles.stackRight}>
          <article className="panel">
            <h3 style={{ marginBottom: 10 }}>User Roles</h3>
            <div className={styles.roleGrid}>
              <div className={styles.roleChip}>ผู้ร้องขอ</div>
              <div className={styles.roleChip}>เจ้าของทรัพย์สิน</div>
              <div className={styles.roleChip}>ผอ. บัญชีกลาง</div>
              <div className={styles.roleChip}>CEO</div>
              <div className={styles.roleChip}>นักบัญชี</div>
              <div className={styles.roleChip}>Admin (IT)</div>
            </div>
          </article>

          <article className={styles.syncBox}>
            <h3>Auto Sync SAP</h3>
            <p className="muted">ซิงค์รายการทุกคืนตามคิวจาก `SapSyncOutbox`</p>
            <p className={styles.syncTime}>00:00</p>
          </article>
        </div>
      </section>
    </div>
  );
}
