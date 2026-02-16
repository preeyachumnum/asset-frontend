"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardCheck,
  FileBarChart2,
  House,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { authLogout } from "@/lib/asset-api";
import { clearSession, readSession } from "@/lib/session";

type NavLinkItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const overviewItem: NavLinkItem = { href: "/", label: "ภาพรวมระบบ", icon: House };

const processItems: NavLinkItem[] = [
  { href: "/assets", label: "รายการทรัพย์สิน", icon: BriefcaseBusiness },
  { href: "/stocktake", label: "การตรวจนับทรัพย์สิน", icon: ClipboardCheck },
  { href: "/reports", label: "รายงาน", icon: FileBarChart2 },
];

const managementChildren: NavLinkItem[] = [
  { href: "/demolish", label: "ตัดบัญชี (Demolish)", icon: Trash2 },
  { href: "/transfer", label: "โอนย้าย (Transfer)", icon: ArrowRightLeft },
];

const settingItems: NavLinkItem[] = [
  { href: "/sync", label: "Auto Sync SAP", icon: RefreshCw },
  { href: "/roles", label: "User Roles", icon: ShieldCheck },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activePath = useMemo(() => pathname || "/", [pathname]);
  const [email, setEmail] = useState("Guest");
  const [busy, setBusy] = useState(false);
  const [openManagement, setOpenManagement] = useState(
    managementChildren.some((x) => isPathActive(activePath, x.href)),
  );

  useEffect(() => {
    const session = readSession();
    setEmail(session?.user.email || "Guest");
  }, [pathname]);

  useEffect(() => {
    if (managementChildren.some((x) => isPathActive(activePath, x.href))) {
      setOpenManagement(true);
    }
  }, [activePath]);

  async function onLogout() {
    if (busy) return;
    setBusy(true);
    const session = readSession();
    try {
      if (session?.sessionId) {
        await authLogout(session.sessionId);
      }
    } catch {
      // ignore and clear local session anyway
    } finally {
      clearSession();
      setBusy(false);
      router.push("/login");
    }
  }

  function renderLink(item: NavLinkItem, nested = false) {
    const Icon = item.icon;
    const active = isPathActive(activePath, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={[
          "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200",
          nested ? "ml-2" : "",
          active
            ? "border-sky-200/45 bg-gradient-to-r from-sky-500/60 to-blue-500/45 text-white shadow-[0_10px_20px_rgba(8,54,94,0.3)]"
            : "border-transparent text-[#dcecff] hover:border-white/20 hover:bg-white/10 hover:text-white",
        ].join(" ")}
      >
        <Icon className="size-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  }

  const managementActive = managementChildren.some((x) => isPathActive(activePath, x.href));

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-4 py-4 text-[#e8f2fb]">
      <div className="rounded-2xl border border-white/18 bg-white/[0.06] p-3.5 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.1em] text-[#bfd8f1]">Mitrphol</p>
        <h2 className="mt-1 text-[32px] leading-none text-white [font-family:var(--font-heading),_Segoe_UI,_sans-serif]">
          E-Asset
        </h2>
        <p className="-mt-0.5 text-xl text-[#e1effc] [font-family:var(--font-heading),_Segoe_UI,_sans-serif]">
          Accounting
        </p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1" aria-label="Main navigation">
        <section>
          <p className="px-1 pb-1 text-xs font-medium text-[#bcd4ea]">ภาพรวมระบบ</p>
          <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-1.5">
            {renderLink(overviewItem)}
          </div>
        </section>

        <section>
          <p className="px-1 pb-1 text-xs font-medium text-[#bcd4ea]">เมนูหลัก</p>
          <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-1.5">
            <div className="space-y-1">
              {renderLink(processItems[0])}
              {renderLink(processItems[1])}

              <div className="rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setOpenManagement((v) => !v)}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                    managementActive || openManagement
                      ? "bg-white/10 text-white"
                      : "text-[#dcecff] hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <ArrowRightLeft className="size-4 shrink-0" />
                  <span className="flex-1 text-left">การจัดการทรัพย์สิน</span>
                  <ChevronDown className={`size-4 transition-transform ${openManagement ? "rotate-180" : ""}`} />
                </button>
                {openManagement ? (
                  <div className="mt-1.5 space-y-1 pl-2">
                    {managementChildren.map((item) => renderLink(item, true))}
                  </div>
                ) : null}
              </div>

              {renderLink(processItems[2])}
            </div>
          </div>
        </section>

        <section>
          <p className="px-1 pb-1 text-xs font-medium text-[#bcd4ea]">ตั้งค่าระบบ</p>
          <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-1.5">
            <div className="space-y-1">{settingItems.map((item) => renderLink(item))}</div>
          </div>
        </section>
      </nav>

      <div className="rounded-2xl border border-white/14 bg-white/[0.05] p-2">
        <p className="mb-1 truncate px-1 text-xs text-[#c6ddf3]">{email}</p>
        <button
          onClick={onLogout}
          disabled={busy}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#b5d4f184] bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-[#eaf5ff] transition-all duration-200 hover:border-[#d3e6f7b8] hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <LogOut size={16} />
          <span>{busy ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}</span>
        </button>
      </div>
    </div>
  );
}
