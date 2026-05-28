"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = "traveler" | "owner" | "admin";

type UserRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: Role;
  created_at: string;
};

type FilterKey = "all" | Role;

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: "all",      label: "全員" },
  { value: "traveler", label: "旅行者" },
  { value: "owner",    label: "オーナー" },
  { value: "admin",    label: "管理者" },
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "traveler", label: "旅行者" },
  { value: "owner",    label: "オーナー" },
  { value: "admin",    label: "管理者" },
];

type RoleConfig = { label: string; className: string };

const ROLE_MAP: Record<Role, RoleConfig> = {
  traveler: { label: "旅行者", className: "bg-gray-100 text-gray-600" },
  owner:    { label: "オーナー", className: "bg-green-100 text-green-700" },
  admin:    { label: "管理者",  className: "bg-purple-100 text-purple-700" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

// ── RoleBadge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  const config = ROLE_MAP[role] ?? { label: role, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-gray-900 px-5 py-3 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}

// ── AdminUsersPage ────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<FilterKey>("all");
  const [search, setSearch]   = useState("");
  const [toast, setToast]     = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, display_name, email, role, created_at")
      .order("created_at", { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        setUsers(data ?? []);
        setLoading(false);
      });
  }, []);

  // タブ別件数
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: users.length };
    for (const u of users) {
      c[u.role] = (c[u.role] ?? 0) + 1;
    }
    return c;
  }, [users]);

  // フィルタ + 検索
  const displayed = useMemo(() => {
    let list = filter === "all" ? users : users.filter(u => u.role === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(u =>
        (u.display_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, filter, search]);

  async function handleRoleChange(userId: string, newRole: Role) {
    setUpdating(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setToast("権限を変更しました");
    }
    setUpdating(null);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>

      {/* 検索 */}
      <div className="max-w-sm">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="表示名またはメールで検索..."
          className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
        />
      </div>

      {/* フィルタタブ */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {FILTERS.map(({ value, label }) => {
          const count    = counts[value] ?? 0;
          const isActive = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`inline-flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-[#1B4332] text-[#1B4332]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                  isActive ? "bg-[#D8F3DC] text-[#1B4332]" : "bg-gray-100 text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ローディング */}
      {loading && (
        <div className="text-sm text-gray-400 py-8 text-center">読み込み中...</div>
      )}

      {/* 0件 */}
      {!loading && displayed.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-400">該当するユーザーがいません</p>
        </div>
      )}

      {/* テーブル */}
      {!loading && displayed.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">

          {/* PC テーブル */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">表示名</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">メールアドレス</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">権限</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">登録日</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map(u => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">
                        {u.display_name || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate">
                        {u.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 tabular-nums whitespace-nowrap">
                        {fmtDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            disabled={isSelf || updating === u.id}
                            onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                            className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332] disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {ROLE_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          {isSelf && (
                            <span className="text-xs text-gray-400">自分</span>
                          )}
                          {updating === u.id && (
                            <span className="text-xs text-gray-400">更新中...</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* モバイル・タブレット カードリスト */}
          <ul className="lg:hidden divide-y divide-gray-100">
            {displayed.map(u => {
              const isSelf = u.id === me?.id;
              return (
                <li key={u.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {u.display_name || <span className="text-gray-400">—</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{u.email || "—"}</p>
                    </div>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      disabled={isSelf || updating === u.id}
                      onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                      className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {ROLE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {isSelf && <span className="text-xs text-gray-400">自分</span>}
                    {updating === u.id && <span className="text-xs text-gray-400">更新中...</span>}
                  </div>
                  <p className="text-xs text-gray-400">登録 {fmtDate(u.created_at)}</p>
                </li>
              );
            })}
          </ul>

        </div>
      )}
    </div>
  );
}
