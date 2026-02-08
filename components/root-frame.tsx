"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { MainNav } from "@/components/main-nav";

type RootFrameProps = {
  children: ReactNode;
};

export function RootFrame({ children }: RootFrameProps) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <div className="login-layout">{children}</div>;
  }

  return (
    <div className="app-shell">
      <aside className="app-shell__nav">
        <MainNav />
      </aside>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
