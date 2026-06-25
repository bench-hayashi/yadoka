"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReservationStatus = "pending" | "approved" | "rejected" | "cancelled";

type Reservation = {
  id: string;
  facility_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  guest_count: number;
  checkin_date: string;
  checkout_date: string;
  total_price: number;
  message: string | null;
  status: ReservationStatus;
  owner_reply: string | null;
  created_at: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

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

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

// チェックイン〜チェックアウト前日の各日付を返す（ローカル日付で計算）
function eachNight(checkin: string, checkout: string): string[] {
  const nights: string[] = [];
  const [cy, cm, cd] = checkin.split("-").map(Number);
  const [oy, om, od] = checkout.split("-").map(Number);
  let cur = new Date(cy, cm - 1, cd);
  const end = new Date(oy, om - 1, od);
  while (cur < end) {
    nights.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`
    );
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }
  return nights;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [reservation,  setReservation]  = useState<Reservation | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [replyText,    setReplyText]    = useState("");
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, id]);

  async function load() {
    // user が確実に存在しない限り所有者チェックは行わない（他人の施設へのアクセス防止）。
    if (!user) { router.replace("/unauthorized"); return; }
    const { data: resData, error: resError } = await supabase
      .from("reservation_requests")
      .select("id, facility_id, guest_name, guest_email, guest_phone, guest_count, checkin_date, checkout_date, total_price, message, status, owner_reply, created_at")
      .eq("id", id)
      .single();

    if (resError || !resData) {
      setFetchError("予約リクエストが見つかりませんでした。");
      setLoading(false);
      return;
    }

    const { data: facData, error: facError } = await supabase
      .from("facilities")
      .select("name, owner_id")
      .eq("id", resData.facility_id)
      .single();

    if (facError || !facData) {
      setFetchError("施設情報が取得できませんでした。");
      setLoading(false);
      return;
    }

    if (facData.owner_id !== user.id) {
      router.replace("/unauthorized");
      return;
    }

    setReservation(resData as Reservation);
    setFacilityName(facData.name);
    if (resData.owner_reply) setReplyText(resData.owner_reply);
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleApprove() {
    if (!reservation) return;
    setSaving(true);

    // 1. 予約ステータスを承認に更新
    await supabase
      .from("reservation_requests")
      .update({ status: "approved", owner_reply: replyText || null })
      .eq("id", id);

    // 2. チェックイン〜チェックアウト前日を満室に設定
    const nights = eachNight(reservation.checkin_date, reservation.checkout_date);
    if (nights.length > 0) {
      await supabase
        .from("availability")
        .delete()
        .eq("facility_id", reservation.facility_id)
        .gte("target_date", nights[0])
        .lte("target_date", nights[nights.length - 1]);

      await supabase
        .from("availability")
        .insert(
          nights.map(d => ({
            facility_id:  reservation.facility_id,
            target_date:  d,
            is_available: false,
            source:       "reservation",
          }))
        );
    }

    setReservation(prev => prev ? { ...prev, status: "approved", owner_reply: replyText || null } : prev);
    showToast("承認しました");
    setSaving(false);
  }

  async function handleReject() {
    if (!reservation) return;
    if (!confirm("このリクエストを拒否しますか？")) return;
    setSaving(true);

    await supabase
      .from("reservation_requests")
      .update({ status: "rejected", owner_reply: replyText || null })
      .eq("id", id);

    setReservation(prev => prev ? { ...prev, status: "rejected", owner_reply: replyText || null } : prev);
    showToast("拒否しました");
    setSaving(false);
  }

  if (authLoading || loading) {
    return <div className="py-8 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  if (fetchError) {
    return <div className="py-8 text-center text-sm text-red-500">{fetchError}</div>;
  }

  if (!reservation) return null;

  const isPending = reservation.status === "pending";

  return (
    <div className="max-w-2xl space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* 戻るリンク */}
      <Link
        href="/owner/reservations"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        予約リクエスト一覧
      </Link>

      {/* ページヘッダー */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">予約リクエスト詳細</h1>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[reservation.status]}`}>
          {STATUS_LABELS[reservation.status]}
        </span>
      </div>

      {/* 施設 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">施設</h2>
        <p className="font-medium text-gray-900">{facilityName}</p>
      </section>

      {/* リクエスト者情報 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">リクエスト者情報</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">名前</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{reservation.guest_name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">メールアドレス</dt>
            <dd className="mt-0.5">
              <a href={`mailto:${reservation.guest_email}`} className="text-[#1B4332] hover:underline">
                {reservation.guest_email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">電話番号</dt>
            <dd className="mt-0.5 text-gray-900">{reservation.guest_phone || "-"}</dd>
          </div>
        </dl>
      </section>

      {/* 日程・人数・金額 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">予約内容</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">チェックイン</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{fmtDate(reservation.checkin_date)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">チェックアウト</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{fmtDate(reservation.checkout_date)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">人数</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{reservation.guest_count}名</dd>
          </div>
        </dl>

        {/* 合計金額（大きく表示） */}
        <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 flex items-baseline justify-between">
          <span className="text-sm text-gray-500">合計金額</span>
          <span className="text-2xl font-bold tabular-nums text-gray-900">
            {fmtPrice(reservation.total_price)}
          </span>
        </div>
      </section>

      {/* メッセージ */}
      {reservation.message && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">メッセージ</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {reservation.message}
          </p>
        </section>
      )}

      {/* 受信日時 */}
      <p className="text-xs text-gray-400">受信日時：{fmtDateTime(reservation.created_at)}</p>

      {/* 承認・拒否フォーム（pending のみ） */}
      {isPending && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">オーナーコメント（任意）</h2>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={4}
            placeholder="ゲストへのコメントを入力してください（承認・拒否メッセージに添付されます）"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReject}
              disabled={saving}
              className="flex-1 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              拒否する
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "処理中..." : "承認する"}
            </button>
          </div>
        </section>
      )}

      {/* 承認済み・拒否済みのオーナーコメント表示 */}
      {!isPending && reservation.status !== "cancelled" && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">オーナーコメント</h2>
          <p className="text-sm text-gray-700">
            {reservation.owner_reply || "（コメントなし）"}
          </p>
        </section>
      )}

    </div>
  );
}
