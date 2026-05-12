import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JXD Gemini 生图工具",
  description: "公司内部 Gemini 生图工具"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
