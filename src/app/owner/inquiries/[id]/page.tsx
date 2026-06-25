"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type InquiryStatus = "new" | "read" | "replied" | "closed";

type Inquiry = {
  id: string;
  facility_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  guest_count: number | null;
  checkin_date: string | null;
  checkout_date: string | null;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

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

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [inquiry,    setInquiry]    = useState<Inquiry | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [replyText,  setReplyText]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, id]);

  async function load() {
    // user が確実に存在しない限り所有者チェックは行わない（他人の施設へのアクセス防止）。
    if (!user) { router.replace("/unauthorized"); return; }
    // 問い合わせ取得
    const { data: inqData, error: inqError } = await supabase
      .from("inquiries")
      .select("id, facility_id, guest_name, guest_email, guest_phone, guest_count, checkin_date, checkout_date, message, status, created_at")
      .eq("id", id)
      .single();

    if (inqError || !inqData) {
      setFetchError("問い合わせが見つかりませんでした。");
      setLoading(false);
      return;
    }

    // 施設取得 & オーナー確認
    const { data: facData, error: facError } = await supabase
      .from("facilities")
      .select("name, owner_id")
      .eq("id", inqData.facility_id)
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

    // 未読なら既読に更新
    let currentStatus = inqData.status as InquiryStatus;
    if (currentStatus === "new") {
      await supabase.from("inquiries").update({ status: "read" }).eq("id", id);
      currentStatus = "read";
    }

    setInquiry({ ...inqData, status: currentStatus } as Inquiry);
    setFacilityName(facData.name);
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleReply() {
    if (!replyText.trim() || !inquiry) return;
    setSaving(true);
    await supabase.from("inquiries").update({ status: "replied" }).eq("id", id);
    setInquiry(prev => prev ? { ...prev, status: "replied" } : prev);
    setReplyText("");
    showToast("返信しました");
    setSaving(false);
  }

  async function handleClose() {
    if (!inquiry) return;
    setSaving(true);
    await supabase.from("inquiries").update({ status: "closed" }).eq("id", id);
    setInquiry(prev => prev ? { ...prev, status: "closed" } : prev);
    showToast("完了にしました");
    setSaving(false);
  }

  if (authLoading || loading) {
    return <div className="py-8 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  if (fetchError) {
    return <div className="py-8 text-center text-sm text-red-500">{fetchError}</div>;
  }

  if (!inquiry) return null;

  const isClosed = inquiry.status === "closed";

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
        href="/owner/inquiries"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        問い合わせ一覧
      </Link>

      {/* ページヘッダー */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">問い合わせ詳細</h1>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[inquiry.status]}`}>
          {STATUS_LABELS[inquiry.status]}
        </span>
      </div>

      {/* 施設 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">施設</h2>
        <p className="font-medium text-gray-900">{facilityName}</p>
      </section>

      {/* 問い合わせ者情報 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">問い合わせ者情報</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">名前</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{inquiry.guest_name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">メールアドレス</dt>
            <dd className="mt-0.5">
              <a href={`mailto:${inquiry.guest_email}`} className="text-[#1B4332] hover:underline">
                {inquiry.guest_email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">電話番号</dt>
            <dd className="mt-0.5 text-gray-900">{inquiry.guest_phone || "-"}</dd>
          </div>
        </dl>
      </section>

      {/* 希望日程・人数 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">希望日程・人数</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">チェックイン</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{fmtDate(inquiry.checkin_date)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">チェックアウト</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{fmtDate(inquiry.checkout_date)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">人数</dt>
            <dd className="mt-0.5 font-medium text-gray-900">
              {inquiry.guest_count != null ? `${inquiry.guest_count}名` : "-"}
            </dd>
          </div>
        </dl>
        {inquiry.checkin_date && inquiry.checkout_date && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <Link
              href={`/owner/calendar?start=${inquiry.checkin_date}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B4332] transition-colors hover:text-[#2D6A4F]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              この日程で空いている物件を確認
            </Link>
          </div>
        )}
      </section>

      {/* メッセージ */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">メッセージ</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {inquiry.message || "（メッセージなし）"}
        </p>
        <p className="mt-4 text-xs text-gray-400">受信日時：{fmtDateTime(inquiry.created_at)}</p>
      </section>

      {/* 返信フォーム（未完了時のみ） */}
      {!isClosed && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">返信</h2>
          <p className="text-xs text-gray-400">
            ※「返信する」を押すとステータスが「返信済」に更新されます（メール送信は未実装）
          </p>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={5}
            placeholder="返信内容を入力してください"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              完了にする
            </button>
            <button
              type="button"
              onClick={handleReply}
              disabled={saving || !replyText.trim()}
              className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2D6A4F] disabled:opacity-50"
            >
              {saving ? "送信中..." : "返信する"}
            </button>
          </div>
        </section>
      )}

      {/* 完了済みバナー */}
      {isClosed && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
          この問い合わせは完了済みです。
        </div>
      )}

    </div>
  );
}
