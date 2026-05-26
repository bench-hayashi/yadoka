"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Facility = {
  id: string;
  name: string;
  status: string;
  is_published: boolean;
  updated_at: string;
  areas: { name: string } | null;
};

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  draft:    { label: "下書き",    className: "bg-gray-100 text-gray-600" },
  pending:  { label: "審査中",    className: "bg-yellow-100 text-yellow-700" },
  approved: { label: "承認済み",  className: "bg-green-100 text-green-700" },
  rejected: { label: "差し戻し",  className: "bg-red-100 text-red-600" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function OwnerFacilitiesPage() {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("facilities")
      .select("id, name, status, is_published, updated_at, areas(name)")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        setFacilities(data ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">施設管理</h1>
        <Link
          href="/owner/facilities/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + 新しい施設を登録
        </Link>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="text-sm text-gray-400 py-8 text-center">読み込み中...</div>
      )}

      {/* 0件 */}
      {!loading && facilities.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center space-y-4">
          <p className="text-sm text-gray-500">登録された施設がありません。</p>
          <Link
            href="/owner/facilities/new"
            className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            新しい施設を登録
          </Link>
        </div>
      )}

      {/* テーブル */}
      {!loading && facilities.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* PC テーブル */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-5 py-3 font-semibold text-gray-600 w-1/3">施設名</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">エリア</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">ステータス</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">公開状態</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">更新日</th>
                  <th className="px-5 py-3 font-semibold text-gray-600 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facilities.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900 truncate max-w-[200px]">
                      {f.name}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {f.areas?.name ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-5 py-4">
                      {f.is_published ? (
                        <span className="text-green-600 font-medium">公開中</span>
                      ) : (
                        <span className="text-gray-400">非公開</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400 tabular-nums">
                      {formatDate(f.updated_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/owner/facilities/${f.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        編集
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* モバイル カードリスト */}
          <ul className="sm:hidden divide-y divide-gray-100">
            {facilities.map((f) => (
              <li key={f.id} className="px-4 py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 text-sm leading-snug">{f.name}</p>
                  <Link
                    href={`/owner/facilities/${f.id}/edit`}
                    className="shrink-0 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    編集
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={f.status} />
                  {f.is_published ? (
                    <span className="text-xs text-green-600 font-medium">公開中</span>
                  ) : (
                    <span className="text-xs text-gray-400">非公開</span>
                  )}
                  {f.areas?.name && (
                    <span className="text-xs text-gray-400">{f.areas.name}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">更新 {formatDate(f.updated_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
