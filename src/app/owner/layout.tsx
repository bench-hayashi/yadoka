"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const NAV_ITEMS = [
  { href: "/owner", label: "ダッシュボード" },
  { href: "/owner/facilities", label: "施設管理" },
  { href: "/owner/inquiries", label: "問い合わせ" },
  { href: "/owner/reservations", label: "予約リクエスト" },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/owner" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav className="flex-1 p-4 space-y-1">
      {NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive(href)
              ? "bg-gray-100 text-gray-900"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* デスクトップサイドバー */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-gray-200 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="px-4 pt-6 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            オーナー管理
          </p>
        </div>
        <NavLinks />
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
      </aside>

      {/* モバイル + メインエリア */}
      <div className="flex-1 min-w-0">
        {/* モバイルヘッダーバー */}
        <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
          <span className="text-sm font-semibold text-gray-900">オーナー管理</span>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* モバイルドロワー */}
        {menuOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setMenuOpen(false)}
          >
            <aside
              className="w-64 h-full bg-white shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 pt-6 pb-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  オーナー管理
                </p>
              </div>
              <NavLinks onNavigate={() => setMenuOpen(false)} />
              <div className="p-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </aside>
          </div>
        )}

        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
