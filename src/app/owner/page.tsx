"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type FacilitySummary = {
  id: string;
  name: string;
  status: string;
  is_published: boolean;
  updated_at: string;
};

type DashboardData = {
  facilities: FacilitySummary[];
  newInquiries: number;
  pendingReservations: number;
};

function statusLabel(f: FacilitySummary): string {
  if (f.is_published) return "公開中";
  if (f.status === "pending") return "審査中";
  return "下書き";
}

function StatusBadge({ facility }: { facility: FacilitySummary }) {
  if (facility.is_published) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        公開中
      </span>
    );
  }
  if (facility.status === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
        審査中
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      下書き
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetch() {
      const { data: facs } = await supabase
        .from("facilities")
        .select("id, name, status, is_published, updated_at")
        .eq("owner_id", user!.id)
        .order("updated_at", { ascending: false });

      const facilities: FacilitySummary[] = (facs ?? []) as FacilitySummary[];
      const facilityIds = facilities.map((f) => f.id);

      let newInquiries = 0;
      let pendingReservations = 0;

      if (facilityIds.length > 0) {
        const [inqRes, resRes] = await Promise.all([
          supabase
            .from("inquiries")
            .select("id", { count: "exact", head: true })
            .eq("status", "new")
            .in("facility_id", facilityIds),
          supabase
            .from("reservation_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending")
            .in("facility_id", facilityIds),
        ]);
        newInquiries = inqRes.count ?? 0;
        pendingReservations = resRes.count ?? 0;
      }

      setData({ facilities, newInquiries, pendingReservations });
      setLoading(false);
    }

    fetch();
  }, [user]);

  if (loading || !data) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">読み込み中...</div>
    );
  }

  const { facilities, newInquiries, pendingReservations } = data;
  const published = facilities.filter((f) => f.is_published).length;
  const pending = facilities.filter((f) => !f.is_published && f.status === "pending").length;
  const draft = facilities.filter((f) => !f.is_published && f.status !== "pending").length;
  const recentFacilities = facilities.slice(0, 5);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <Link
          href="/owner/facilities/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + 新しい施設を登録
        </Link>
      </div>

      {/* 施設ステータス サマリー */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          施設ステータス
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-1">
            <p className="text-xs font-medium text-gray-500">公開中</p>
            <p className="text-3xl font-bold text-green-600">{published}</p>
            <p className="text-xs text-gray-400">件</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-1">
            <p className="text-xs font-medium text-gray-500">審査中</p>
            <p className="text-3xl font-bold text-yellow-500">{pending}</p>
            <p className="text-xs text-gray-400">件</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-1">
            <p className="text-xs font-medium text-gray-500">下書き</p>
            <p className="text-3xl font-bold text-gray-400">{draft}</p>
            <p className="text-xs text-gray-400">件</p>
          </div>
        </div>
      </section>

      {/* 通知サマリー */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          未対応の通知
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/owner/inquiries"
            className="rounded-xl bg-white border border-gray-200 p-5 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-gray-500">新着問い合わせ</p>
              <p className="text-2xl font-bold text-gray-900">{newInquiries}</p>
              <p className="text-xs text-gray-400">件</p>
            </div>
            {newInquiries > 0 && (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {newInquiries > 99 ? "99+" : newInquiries}
              </span>
            )}
          </Link>
          <Link
            href="/owner/reservations"
            className="rounded-xl bg-white border border-gray-200 p-5 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-gray-500">未対応の予約リクエスト</p>
              <p className="text-2xl font-bold text-gray-900">{pendingReservations}</p>
              <p className="text-xs text-gray-400">件</p>
            </div>
            {pendingReservations > 0 && (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                {pendingReservations > 99 ? "99+" : pendingReservations}
              </span>
            )}
          </Link>
        </div>
      </section>

      {/* 最近の施設一覧 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            最近の施設
          </h2>
          <Link
            href="/owner/facilities"
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            すべて見る →
          </Link>
        </div>

        {recentFacilities.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500 mb-4">登録済みの施設はありません。</p>
            <Link
              href="/owner/facilities/new"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              最初の施設を登録する →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {recentFacilities.map((facility) => (
              <div
                key={facility.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusBadge facility={facility} />
                  <p className="text-sm font-medium text-gray-900 truncate">{facility.name}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="hidden sm:block text-xs text-gray-400">
                    更新 {formatDate(facility.updated_at)}
                  </span>
                  <Link
                    href={`/owner/facilities/${facility.id}/edit`}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
                  >
                    編集
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
