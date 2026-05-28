"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

// ── ナビゲーション定義 ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/admin",             label: "ダッシュボード" },
  { href: "/admin/facilities",  label: "施設審査" },
  { href: "/admin/users",       label: "ユーザー管理" },
  { href: "/admin/tags",        label: "タグ管理" },
] as const;

// ── NavLinks ──────────────────────────────────────────────────────────────────

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/admin" ? pathname === href : pathname.startsWith(href);
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
              ? "bg-white/15 text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

// ── AdminLayout ───────────────────────────────────────────────────────────────

type RoleStatus = "loading" | "admin" | "unauthorized";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [roleStatus, setRoleStatus] = useState<RoleStatus>("loading");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role === "admin") {
          setRoleStatus("admin");
        } else {
          setRoleStatus("unauthorized");
          router.replace("/unauthorized");
        }
      });
  }, [user, authLoading, router]);

  if (authLoading || roleStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        読み込み中...
      </div>
    );
  }

  if (roleStatus !== "admin") {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* デスクトップサイドバー */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"
        style={{ background: "#0d2818" }}
      >
        <div className="px-4 pt-6 pb-2">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            管理者パネル
          </p>
        </div>
        <NavLinks />
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/40 truncate">{user!.email}</p>
        </div>
      </aside>

      {/* モバイル + メインエリア */}
      <div className="flex-1 min-w-0">
        {/* モバイルヘッダーバー */}
        <div
          className="md:hidden flex items-center justify-between border-b px-4 py-3"
          style={{ background: "#0d2818", borderColor: "rgba(255,255,255,0.1)" }}
        >
          <span className="text-sm font-semibold text-white">管理者パネル</span>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            className="p-2 rounded-md text-white/60 hover:bg-white/10 transition-colors"
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
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMenuOpen(false)}
          >
            <aside
              className="w-64 h-full flex flex-col shadow-xl"
              style={{ background: "#0d2818" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 pt-6 pb-2 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                  管理者パネル
                </p>
              </div>
              <NavLinks onNavigate={() => setMenuOpen(false)} />
              <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <p className="text-xs text-white/40 truncate">{user!.email}</p>
              </div>
            </aside>
          </div>
        )}

        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
