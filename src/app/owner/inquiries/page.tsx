"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type InquiryStatus = "new" | "read" | "replied" | "closed";

type InquiryRow = {
  id: string;
  facility_id: string;
  guest_name: string;
  guest_count: number | null;
  checkin_date: string | null;
  checkout_date: string | null;
  status: InquiryStatus;
  created_at: string;
  facilityName: string;
};

type FilterKey = "all" | "new" | "replied" | "closed";

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: "all",     label: "全件" },
  { value: "new",     label: "未読" },
  { value: "replied", label: "返信済" },
  { value: "closed",  label: "完了" },
];

const STATUS_STYLES: Record<InquiryStatus, string> = {
  new:     "bg-red-100 text-red-700",
  read:    "bg-gray-100 text-gray-600",
  replied: "bg-blue-100 text-blue-700",
  closed:  "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new:     "未読",
  read:    "既読",
  replied: "返信済",
  closed:  "完了",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null): string {
  return s ? s.replace(/-/g, "/") : "-";
}

function fmtCreatedAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InquiriesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<FilterKey>("all");

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

    // Step 2: 該当施設の問い合わせを新しい順で取得
    const { data } = await supabase
      .from("inquiries")
      .select("id, facility_id, guest_name, guest_count, checkin_date, checkout_date, status, created_at")
      .in("facility_id", facilityIds)
      .order("created_at", { ascending: false });

    setInquiries(
      (data ?? []).map(row => ({
        id:            row.id,
        facility_id:   row.facility_id,
        guest_name:    row.guest_name,
        guest_count:   row.guest_count,
        checkin_date:  row.checkin_date,
        checkout_date: row.checkout_date,
        status:        row.status as InquiryStatus,
        created_at:    row.created_at,
        facilityName:  facilityMap.get(row.facility_id) ?? "",
      }))
    );
    setLoading(false);
  }

  const newCount  = inquiries.filter(i => i.status === "new").length;
  const displayed = filter === "all" ? inquiries : inquiries.filter(i => i.status === filter);

  if (authLoading || loading) {
    return <div className="py-8 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">問い合わせ一覧</h1>

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
            {f.value === "new" && newCount > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700 tabular-nums">
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 件数なし */}
      {displayed.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-400">問い合わせはまだありません</p>
      )}

      {/* テーブル */}
      {displayed.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ステータス</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">施設名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">問い合わせ者</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">希望日程</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">人数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">受信日</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map(inq => (
                <tr key={inq.id} className="bg-white transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inq.status]}`}>
                      {STATUS_LABELS[inq.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{inq.facilityName}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{inq.guest_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {inq.checkin_date && inq.checkout_date
                      ? `${fmtDate(inq.checkin_date)}〜${fmtDate(inq.checkout_date)}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {inq.guest_count != null ? `${inq.guest_count}名` : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {fmtCreatedAt(inq.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/owner/inquiries/${inq.id}`}
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
