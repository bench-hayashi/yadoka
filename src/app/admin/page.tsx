"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Summary = {
  totalFacilities: number;
  publishedFacilities: number;
  pendingFacilities: number;
  totalUsers: number;
  totalOwners: number;
  newInquiries: number;
  pendingReservations: number;
};

type PendingFacility = {
  id: string;
  name: string;
  ownerName: string;
  createdAt: string;
};

type RecentItem = {
  id: string;
  facilityName: string;
  guestName: string;
  createdAt: string;
};

type RecentActivity = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
};

type DashboardData = {
  summary: Summary;
  pendingFacilities: PendingFacility[];
  recentInquiries: RecentItem[];
  recentReservations: RecentItem[];
  recentActivities: RecentActivity[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft:     { label: "下書き",   className: "bg-gray-100 text-gray-600" },
  pending:   { label: "審査待ち", className: "bg-amber-100 text-amber-700" },
  approved:  { label: "承認済",   className: "bg-green-100 text-green-700" },
  rejected:  { label: "差し戻し", className: "bg-red-100 text-red-600" },
  suspended: { label: "停止",     className: "bg-gray-700 text-white" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

// ── SummaryCard ───────────────────────────────────────────────────────────────

type SummaryCardProps = {
  label: string;
  value: number;
  colorClass: string;
};

function SummaryCard({ label, value, colorClass }: SummaryCardProps) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-1">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${colorClass}`}>{value}</p>
      <p className="text-xs text-gray-400">件</p>
    </div>
  );
}

// ── AdminDashboard ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { count: totalFacilities },
        { count: publishedFacilities },
        { count: pendingFacilitiesCount },
        { count: totalUsers },
        { count: totalOwners },
        { count: newInquiries },
        { count: pendingReservations },
        { data: pendingFacsRaw },
        { data: recentInqRaw },
        { data: recentResRaw },
        { data: recentActivitiesRaw },
      ] = await Promise.all([
        supabase
          .from("facilities")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("facilities")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true),
        supabase
          .from("facilities")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "owner"),
        supabase
          .from("inquiries")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("reservation_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        // 審査待ち施設（オーナー名付き）
        supabase
          .from("facilities")
          .select("id, name, created_at, profiles!owner_id(display_name)")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5),
        // 最近の問い合わせ（施設名付き）
        supabase
          .from("inquiries")
          .select("id, guest_name, created_at, facilities(id, name)")
          .order("created_at", { ascending: false })
          .limit(5),
        // 最近の予約リクエスト（施設名付き）
        supabase
          .from("reservation_requests")
          .select("id, guest_name, created_at, facilities(id, name)")
          .order("created_at", { ascending: false })
          .limit(5),
        // 最近の操作（updated_at 新しい順）
        supabase
          .from("facilities")
          .select("id, name, status, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pendingFacilities: PendingFacility[] = (pendingFacsRaw ?? []).map((f: any) => ({
        id: f.id,
        name: f.name,
        ownerName: f.profiles?.display_name ?? "—",
        createdAt: f.created_at,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recentInquiries: RecentItem[] = (recentInqRaw ?? []).map((i: any) => ({
        id: i.id,
        facilityName: i.facilities?.name ?? "—",
        guestName: i.guest_name,
        createdAt: i.created_at,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recentReservations: RecentItem[] = (recentResRaw ?? []).map((r: any) => ({
        id: r.id,
        facilityName: r.facilities?.name ?? "—",
        guestName: r.guest_name,
        createdAt: r.created_at,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recentActivities: RecentActivity[] = (recentActivitiesRaw ?? []).map((f: any) => ({
        id:        f.id,
        name:      f.name,
        status:    f.status,
        updatedAt: f.updated_at,
      }));

      setData({
        summary: {
          totalFacilities:    totalFacilities    ?? 0,
          publishedFacilities: publishedFacilities ?? 0,
          pendingFacilities:  pendingFacilitiesCount ?? 0,
          totalUsers:         totalUsers         ?? 0,
          totalOwners:        totalOwners        ?? 0,
          newInquiries:       newInquiries       ?? 0,
          pendingReservations: pendingReservations ?? 0,
        },
        pendingFacilities,
        recentInquiries,
        recentReservations,
        recentActivities,
      });
      setLoading(false);
    }

    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">読み込み中...</div>
    );
  }

  const { summary, pendingFacilities, recentInquiries, recentReservations, recentActivities } = data;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* ページヘッダー */}
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>

      {/* サマリーカード */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          サマリー
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <SummaryCard label="全施設数"             value={summary.totalFacilities}     colorClass="text-gray-700" />
          <SummaryCard label="公開中の施設"          value={summary.publishedFacilities}  colorClass="text-green-600" />
          <SummaryCard label="審査待ち"              value={summary.pendingFacilities}    colorClass="text-amber-500" />
          <SummaryCard label="登録ユーザー数"        value={summary.totalUsers}           colorClass="text-blue-600" />
          <SummaryCard label="オーナー数"            value={summary.totalOwners}          colorClass="text-indigo-600" />
          <SummaryCard label="未読の問い合わせ"      value={summary.newInquiries}         colorClass="text-red-600" />
          <SummaryCard label="未対応の予約リクエスト" value={summary.pendingReservations}  colorClass="text-orange-500" />
        </div>
      </section>

      {/* 審査待ち施設 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            最近の審査待ち施設
          </h2>
          <Link
            href="/admin/facilities"
            className="text-xs text-[#1B4332] hover:text-[#2D6A4F] transition-colors"
          >
            すべて見る →
          </Link>
        </div>
        {pendingFacilities.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-400">審査待ちの施設はありません</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {pendingFacilities.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    オーナー：{f.ownerName}　申請：{fmtDate(f.createdAt)}
                  </p>
                </div>
                <Link
                  href={`/admin/facilities/${f.id}`}
                  className="ml-4 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  審査する
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 最近の操作 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            最近の操作
          </h2>
          <Link
            href="/admin/facilities"
            className="text-xs text-[#1B4332] hover:text-[#2D6A4F] transition-colors"
          >
            施設一覧 →
          </Link>
        </div>
        {recentActivities.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-400">操作履歴がありません</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {recentActivities.map((f) => (
              <Link
                key={f.id}
                href={`/admin/facilities/${f.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <StatusBadge status={f.status} />
                  <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                </div>
                <p className="ml-4 shrink-0 text-xs text-gray-400 tabular-nums">
                  {fmtDateTime(f.updatedAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 最近の問い合わせ・予約リクエスト */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 最近の問い合わせ */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            最近の問い合わせ
          </h2>
          {recentInquiries.length === 0 ? (
            <div className="rounded-xl bg-white border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">問い合わせはまだありません</p>
            </div>
          ) : (
            <div className="rounded-xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {recentInquiries.map((i) => (
                <div key={i.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-900 truncate">{i.facilityName}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500">{i.guestName}</p>
                    <p className="text-xs text-gray-400">{fmtDate(i.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 最近の予約リクエスト */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            最近の予約リクエスト
          </h2>
          {recentReservations.length === 0 ? (
            <div className="rounded-xl bg-white border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">予約リクエストはまだありません</p>
            </div>
          ) : (
            <div className="rounded-xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {recentReservations.map((r) => (
                <div key={r.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.facilityName}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500">{r.guestName}</p>
                    <p className="text-xs text-gray-400">{fmtDate(r.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
