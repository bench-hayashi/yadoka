import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";
import SessionTimeoutGuard from "@/components/SessionTimeoutGuard";

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B4332",
};

export const metadata: Metadata = {
  title: {
    default: "YADOKA | 貸別荘・一棟貸し専門の検索ポータル",
    template: "%s | YADOKA",
  },
  description:
    "全国の貸別荘・一棟貸しを空き状況と料金つきで比較・検索。グループ旅行、家族旅行に最適な施設が見つかります。",
  openGraph: {
    siteName: "YADOKA",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-screen flex flex-col font-[var(--font-noto-sans-jp)]">
        <AuthProvider>
          <SessionTimeoutGuard>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </SessionTimeoutGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
