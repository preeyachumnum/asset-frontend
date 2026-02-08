"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  BriefcaseBusiness,
  ClipboardCheck,
  FileBarChart2,
  House,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { authLogout } from "@/lib/asset-api";
import { clearSession, readSession } from "@/lib/session";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const menu: NavItem[] = [
  { href: "/", label: "ภาพรวมระบบ", icon: House },
  { href: "/assets", label: "รายการทรัพย์สิน", icon: BriefcaseBusiness },
  { href: "/stocktake", label: "ตรวจนับทรัพย์สิน", icon: ClipboardCheck },
  { href: "/demolish", label: "ตัดบัญชี (Demolish)", icon: Trash2 },
  { href: "/transfer", label: "โอนย้าย (Transfer)", icon: ArrowRightLeft },
  { href: "/reports", label: "รายงาน", icon: FileBarChart2 },
  { href: "/sync", label: "Auto Sync SAP", icon: RefreshCw },
  { href: "/roles", label: "User Roles", icon: ShieldCheck },
];

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string>("Guest");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = readSession();
    setEmail(session?.user.email || "Guest");
  }, [pathname]);

  const activePath = useMemo(() => pathname || "/", [pathname]);

  async function onLogout() {
    if (busy) return;
    setBusy(true);
    const session = readSession();

    try {
      if (session?.sessionId) {
        await authLogout(session.sessionId);
      }
    } catch {
      // Ignore logout API errors and clear local session anyway.
    } finally {
      clearSession();
      setBusy(false);
      router.push("/login");
    }
  }

  return (
    <div className="nav-wrap">
      <div className="brand">
        <p className="brand__eyebrow">Mitrphol</p>
        <h2 className="brand__title">E-Asset Accounting</h2>
        <p className="brand__sub">Frontend from req + OverAllDB</p>
      </div>

      <nav className="menu">
        {menu.map(({ href, label, icon: Icon }) => {
          const isActive =
            activePath === href || (href !== "/" && activePath.startsWith(`${href}/`));

          return (
            <Link
              key={href}
              href={href}
              className={`menu-item ${isActive ? "menu-item--active" : ""}`}
            >
              <Icon className="menu-item__icon" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="nav-user">
        <p className="nav-user__label">Signed in</p>
        <p className="nav-user__email">{email}</p>
        <button onClick={onLogout} disabled={busy} className="button button--ghost">
          <LogOut size={16} />
          <span>{busy ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}</span>
        </button>
      </div>
    </div>
  );
}
