import type { Metadata } from "next";
import { Bai_Jamjuree, Sarabun } from "next/font/google";

import { RootFrame } from "@/components/root-frame";
import "./globals.css";

const fontBody = Sarabun({
  variable: "--font-body",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
});

const fontHeading = Bai_Jamjuree({
  variable: "--font-heading",
  subsets: ["latin", "thai"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "E-Asset Accounting Frontend",
  description:
    "Frontend for asset listing, stocktake, demolish, transfer, approval flow and SAP sync",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${fontBody.variable} ${fontHeading.variable}`}>
        <RootFrame>{children}</RootFrame>
      </body>
    </html>
  );
}
