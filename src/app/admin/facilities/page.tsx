"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Facility = {
  id: string;
  name: string;
  status: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  ownerName: string;
  areaName: string;
};

type FilterKey = "all" | "pending" | "approved" | "rejected" | "draft" | "suspended";

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: "all",       label: "全件" },
  { value: "pending",   label: "審査待ち" },
  { value: "approved",  label: "承認済" },
  { value: "rejected",  label: "差し戻し" },
  { value: "draft",     label: "下書き" },
  { value: "suspended", label: "停止" },
];

type StatusConfig = { label: string; className: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  draft:     { label: "下書き",   className: "bg-gray-100 text-gray-600" },
  pending:   { label: "審査待ち", className: "bg-amber-100 text-amber-700" },
  approved:  { label: "承認済",   className: "bg-green-100 text-green-700" },
  rejected:  { label: "差し戻し", className: "bg-red-100 text-red-600" },
  suspended: { label: "停止",     className: "bg-gray-700 text-white" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

// ── AdminFacilitiesPage ───────────────────────────────────────────────────────

export default function AdminFacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<FilterKey>("pending");
  const [search, setSearch]         = useState("");

  useEffect(() => {
    supabase
      .from("facilities")
      .select("id, name, status, is_published, created_at, updated_at, profiles!owner_id(display_name), areas(name)")
      .order("created_at", { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFacilities((data ?? []).map((f: any) => ({
          id:           f.id,
          name:         f.name,
          status:       f.status,
          is_published: f.is_published,
          created_at:   f.created_at,
          updated_at:   f.updated_at,
          ownerName:    f.profiles?.display_name ?? "—",
          areaName:     f.areas?.name ?? "—",
        })));
        setLoading(false);
      });
  }, []);

  // ステータス別件数（全タブのバッジ用）
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: facilities.length };
    for (const f of facilities) {
      c[f.status] = (c[f.status] ?? 0) + 1;
    }
    return c;
  }, [facilities]);

  // フィルタ + 施設名検索
  const displayed = useMemo(() => {
    let list = filter === "all" ? facilities : facilities.filter(f => f.status === filter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(f => f.name.toLowerCase().includes(q));
    return list;
  }, [facilities, filter, search]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ページヘッダー */}
      <h1 className="text-2xl font-bold text-gray-900">施設審査</h1>

      {/* 施設名検索 */}
      <div className="max-w-sm">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="施設名で検索..."
          className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
        />
      </div>

      {/* ステータスフィルタタブ */}
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
          <p className="text-sm text-gray-400">該当する施設がありません</p>
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
                  <th className="px-4 py-3 font-semibold text-gray-600">施設名</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">オーナー</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">エリア</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">ステータス</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">公開</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">申請日</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">更新日</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                      {f.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[130px] truncate">
                      {f.ownerName}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {f.areaName}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {f.is_published ? (
                        <span className="text-xs font-medium text-green-600">公開中</span>
                      ) : (
                        <span className="text-xs text-gray-400">非公開</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 tabular-nums whitespace-nowrap">
                      {fmtDate(f.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 tabular-nums whitespace-nowrap">
                      {fmtDate(f.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/facilities/${f.id}`}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        審査
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* モバイル・タブレット カードリスト */}
          <ul className="lg:hidden divide-y divide-gray-100">
            {displayed.map(f => (
              <li key={f.id} className="px-4 py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-snug truncate">
                      {f.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {f.ownerName}　{f.areaName}
                    </p>
                  </div>
                  <Link
                    href={`/admin/facilities/${f.id}`}
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    審査
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={f.status} />
                  {f.is_published ? (
                    <span className="text-xs font-medium text-green-600">公開中</span>
                  ) : (
                    <span className="text-xs text-gray-400">非公開</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  申請 {fmtDate(f.created_at)}　更新 {fmtDate(f.updated_at)}
                </p>
              </li>
            ))}
          </ul>

        </div>
      )}
    </div>
  );
}
