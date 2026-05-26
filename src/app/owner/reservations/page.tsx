"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReservationStatus = "pending" | "approved" | "rejected" | "cancelled";

type ReservationRow = {
  id: string;
  facility_id: string;
  guest_name: string;
  guest_count: number;
  checkin_date: string;
  checkout_date: string;
  total_price: number;
  status: ReservationStatus;
  created_at: string;
  facilityName: string;
};

type FilterKey = "all" | "pending" | "approved" | "rejected";

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: "all",      label: "全件" },
  { value: "pending",  label: "確認待ち" },
  { value: "approved", label: "承認済" },
  { value: "rejected", label: "拒否" },
];

const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  approved:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending:   "確認待ち",
  approved:  "承認済",
  rejected:  "拒否",
  cancelled: "キャンセル",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string): string {
  return s.replace(/-/g, "/");
}

function fmtPrice(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function fmtCreatedAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterKey>("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    // Step 1: 自分の施設一覧を取得
    const { data: facilities } = await supabase
      .from("facilities")
      .select("id, name")
      .eq("owner_id", user!.id);

    if (!facilities || facilities.length === 0) {
      setLoading(false);
      return;
    }

    const facilityMap = new Map(facilities.map(f => [f.id as string, f.name as string]));
    const facilityIds = [...facilityMap.keys()];

    // Step 2: 該当施設の予約リクエストを新しい順で取得
    const { data } = await supabase
      .from("reservation_requests")
      .select("id, facility_id, guest_name, guest_count, checkin_date, checkout_date, total_price, status, created_at")
      .in("facility_id", facilityIds)
      .order("created_at", { ascending: false });

    setReservations(
      (data ?? []).map(row => ({
        id:            row.id,
        facility_id:   row.facility_id,
        guest_name:    row.guest_name,
        guest_count:   row.guest_count,
        checkin_date:  row.checkin_date,
        checkout_date: row.checkout_date,
        total_price:   row.total_price,
        status:        row.status as ReservationStatus,
        created_at:    row.created_at,
        facilityName:  facilityMap.get(row.facility_id) ?? "",
      }))
    );
    setLoading(false);
  }

  const pendingCount = reservations.filter(r => r.status === "pending").length;
  const displayed    = filter === "all" ? reservations : reservations.filter(r => r.status === filter);

  if (authLoading || loading) {
    return <div className="py-8 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">予約リクエスト一覧</h1>

      {/* フィルタータブ */}
      <div className="flex border-b border-gray-200">
        {FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              filter === f.value
                ? "border-[#1B4332] text-[#1B4332]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {f.label}
            {f.value === "pending" && pendingCount > 0 && (
              <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-semibold text-yellow-700 tabular-nums">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 件数なし */}
      {displayed.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-400">予約リクエストはまだありません</p>
      )}

      {/* テーブル */}
      {displayed.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ステータス</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">施設名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">リクエスト者</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">日程</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">人数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">合計金額</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">受信日</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map(r => (
                <tr key={r.id} className="bg-white transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.facilityName}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.guest_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {fmtDate(r.checkin_date)}〜{fmtDate(r.checkout_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.guest_count}名</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900">
                    {fmtPrice(r.total_price)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {fmtCreatedAt(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/owner/reservations/${r.id}`}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
