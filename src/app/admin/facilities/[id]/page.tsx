"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type FacilityDetail = {
  id: string;
  name: string;
  status: string;
  is_published: boolean;
  description: string | null;
  address: string | null;
  max_guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  checkin_time: string | null;
  checkout_time: string | null;
  min_nights: number | null;
  license_type: string | null;
  license_number: string | null;
  created_at: string;
  updated_at: string;
  ownerName: string;
  ownerEmail: string;
  areaName: string;
};

type FacilityImage = {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_hero: boolean;
};

type TagRow = {
  id: string;
  name: string;
  category: string;
};

type PricingRule = {
  season: string;
  day_type: string;
  price_per_night: number | null;
};

type SeasonRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft:     { label: "下書き",   className: "bg-gray-100 text-gray-600" },
  pending:   { label: "審査待ち", className: "bg-amber-100 text-amber-700" },
  approved:  { label: "承認済",   className: "bg-green-100 text-green-700" },
  rejected:  { label: "差し戻し", className: "bg-red-100 text-red-600" },
  suspended: { label: "停止",     className: "bg-gray-700 text-white" },
};

const SEASONS    = ["low", "mid", "high"] as const;
const DAY_TYPES  = ["weekday", "weekend"] as const;
const SEASON_LABEL: Record<string, string>  = { low: "ローシーズン", mid: "ミドルシーズン", high: "ハイシーズン" };
const DAY_LABEL: Record<string, string>     = { weekday: "平日", weekend: "休日" };
const SEASON_NAME_LABEL: Record<string, string> = { low: "ロー", mid: "ミドル", high: "ハイ" };

const TAG_CATEGORY_LABEL: Record<string, string> = {
  facility: "設備",
  theme:    "テーマ",
  amenity:  "アメニティ",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function fmtPrice(n: number | null) {
  if (n == null) return "—";
  return `¥${n.toLocaleString("ja-JP")}`;
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2 border-b border-gray-50 last:border-0">
      <dt className="w-32 shrink-0 text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-800">{value ?? "—"}</dd>
    </div>
  );
}

// ── AdminFacilityDetailPage ───────────────────────────────────────────────────

export default function AdminFacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [facility, setFacility]     = useState<FacilityDetail | null>(null);
  const [images,   setImages]       = useState<FacilityImage[]>([]);
  const [tags,     setTags]         = useState<TagRow[]>([]);
  const [pricing,  setPricing]      = useState<PricingRule[]>([]);
  const [seasons,  setSeasons]      = useState<SeasonRow[]>([]);

  const [loading,  setLoading]      = useState(true);
  const [error,    setError]        = useState<string | null>(null);
  const [comment,  setComment]      = useState("");
  const [commentError, setCommentError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast,    setToast]        = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [
        { data: fac, error: facErr },
        { data: imgs },
        { data: tagLinks },
        { data: rules },
        { data: seas },
      ] = await Promise.all([
        supabase
          .from("facilities")
          .select("id, name, status, is_published, description, address, max_guests, bedrooms, bathrooms, parking_spaces, checkin_time, checkout_time, min_nights, license_type, license_number, created_at, updated_at, profiles!owner_id(display_name, email), areas(name)")
          .eq("id", id)
          .single(),
        supabase
          .from("facility_images")
          .select("id, url, alt_text, sort_order, is_hero")
          .eq("facility_id", id)
          .order("sort_order"),
        supabase
          .from("facility_tags")
          .select("tags(id, name, category)")
          .eq("facility_id", id),
        supabase
          .from("pricing_rules")
          .select("season, day_type, price_per_night")
          .eq("facility_id", id),
        supabase
          .from("seasons")
          .select("id, name, start_date, end_date")
          .eq("facility_id", id)
          .order("start_date"),
      ]);

      if (facErr || !fac) {
        setError("施設が見つかりませんでした");
        setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f = fac as any;
      setFacility({
        id:             f.id,
        name:           f.name,
        status:         f.status,
        is_published:   f.is_published,
        description:    f.description,
        address:        f.address,
        max_guests:     f.max_guests,
        bedrooms:       f.bedrooms,
        bathrooms:      f.bathrooms,
        parking_spaces: f.parking_spaces,
        checkin_time:   f.checkin_time,
        checkout_time:  f.checkout_time,
        min_nights:     f.min_nights,
        license_type:   f.license_type ?? null,
        license_number: f.license_number ?? null,
        created_at:     f.created_at,
        updated_at:     f.updated_at,
        ownerName:      f.profiles?.display_name ?? "—",
        ownerEmail:     f.profiles?.email ?? "—",
        areaName:       f.areas?.name ?? "—",
      });

      setImages(imgs ?? []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTags((tagLinks ?? []).flatMap((t: any) => t.tags ? [t.tags] : []));

      setPricing(rules ?? []);
      setSeasons(seas ?? []);
      setLoading(false);
    }

    load();
  }, [id]);

  // ── 料金マップ ──────────────────────────────────────────────────────────────

  const pricingMap: Record<string, number | null> = {};
  for (const rule of pricing) {
    pricingMap[`${rule.season}_${rule.day_type}`] = rule.price_per_night ?? null;
  }

  // ── タグカテゴリ別 ─────────────────────────────────────────────────────────

  const tagsByCategory = tags.reduce<Record<string, TagRow[]>>((acc, tag) => {
    (acc[tag.category] ??= []).push(tag);
    return acc;
  }, {});

  // ── アクション ─────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleApprove() {
    if (!facility) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("facilities")
      .update({ status: "approved", is_published: true, published_at: new Date().toISOString() })
      .eq("id", id);
    setSubmitting(false);
    if (error) { showToast("エラーが発生しました"); return; }
    router.push("/admin/facilities");
  }

  async function handleReject() {
    if (!facility) return;
    if (!comment.trim()) {
      setCommentError("差し戻し理由を入力してください");
      return;
    }
    setCommentError("");
    setSubmitting(true);
    const { error } = await supabase
      .from("facilities")
      .update({ status: "rejected" })
      .eq("id", id);
    setSubmitting(false);
    if (error) { showToast("エラーが発生しました"); return; }
    router.push("/admin/facilities");
  }

  async function handleSuspend() {
    if (!facility) return;
    if (!window.confirm(`「${facility.name}」を掲載停止にしますか？\nこの操作により施設は非公開になります。`)) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("facilities")
      .update({ status: "suspended", is_published: false })
      .eq("id", id);
    setSubmitting(false);
    if (error) { showToast("エラーが発生しました"); return; }
    router.push("/admin/facilities");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">読み込み中...</div>;
  }

  if (error || !facility) {
    return <div className="text-sm text-red-500 py-8 text-center">{error ?? "施設が見つかりませんでした"}</div>;
  }

  const statusConfig = STATUS_MAP[facility.status] ?? { label: facility.status, className: "bg-gray-100 text-gray-600" };
  const isApproved   = facility.status === "approved";

  return (
    <div className="space-y-6 max-w-4xl">

      {/* 戻るリンク */}
      <Link
        href="/admin/facilities"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        施設審査一覧に戻る
      </Link>

      {/* ヘッダー：施設名・ステータス・基本情報 */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{facility.name}</h1>
          <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
          {facility.is_published && (
            <span className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold bg-green-100 text-green-700">
              公開中
            </span>
          )}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <InfoRow label="オーナー"   value={facility.ownerName} />
          <InfoRow label="メール"     value={<span className="break-all">{facility.ownerEmail}</span>} />
          <InfoRow label="エリア"     value={facility.areaName} />
          <InfoRow label="住所"       value={facility.address} />
          <InfoRow label="登録日"     value={fmtDate(facility.created_at)} />
          <InfoRow label="最終更新"   value={fmtDate(facility.updated_at)} />
        </dl>
      </section>

      {/* 写真 */}
      <Section title="写真">
        {images.length === 0 ? (
          <p className="text-sm text-gray-400">写真は登録されていません</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map(img => (
              <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt_text ?? ""}
                  className="w-full h-full object-cover"
                />
                {img.is_hero && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-white leading-none">
                    ★
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 施設情報 */}
      <Section title="施設情報">
        <div className="space-y-6">

          {/* 説明文 */}
          {facility.description && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">説明文</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {facility.description}
              </p>
            </div>
          )}

          {/* 宿泊条件 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">宿泊条件</p>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "定員",         value: facility.max_guests     != null ? `${facility.max_guests}名` : null },
                { label: "寝室数",       value: facility.bedrooms       != null ? `${facility.bedrooms}室` : null },
                { label: "バスルーム",   value: facility.bathrooms      != null ? `${facility.bathrooms}室` : null },
                { label: "駐車場",       value: facility.parking_spaces != null ? `${facility.parking_spaces}台` : null },
                { label: "チェックイン", value: facility.checkin_time },
                { label: "チェックアウト", value: facility.checkout_time },
                { label: "最低泊数",     value: facility.min_nights     != null ? `${facility.min_nights}泊` : null },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{value ?? "—"}</p>
                </div>
              ))}
            </dl>
          </div>

          {/* 営業許可情報 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">営業許可情報</p>
            {!facility.license_type && !facility.license_number ? (
              <p className="text-sm font-semibold text-red-600">
                ⚠ 未登録 — 許可種別・許可番号が登録されていません
              </p>
            ) : (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-400">許可種別</p>
                  <p className={`text-sm font-medium mt-0.5 ${facility.license_type ? "text-gray-800" : "text-red-600"}`}>
                    {facility.license_type ?? "未登録"}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-400">許可番号</p>
                  <p className={`text-sm font-medium mt-0.5 ${facility.license_number ? "text-gray-800" : "text-red-600"}`}>
                    {facility.license_number ?? "未登録"}
                  </p>
                </div>
              </dl>
            )}
          </div>

          {/* タグ */}
          {tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">タグ</p>
              <div className="space-y-2">
                {Object.entries(tagsByCategory).map(([category, catTags]) => (
                  <div key={category} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400 w-16 shrink-0">
                      {TAG_CATEGORY_LABEL[category] ?? category}
                    </span>
                    {catTags.map(tag => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-gray-200 bg-white px-3 py-0.5 text-xs text-gray-700"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </Section>

      {/* 料金 */}
      <Section title="料金設定">
        <div className="space-y-6">

          {/* 料金テーブル */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">料金テーブル（1泊あたり）</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">シーズン</th>
                    {DAY_TYPES.map(dt => (
                      <th key={dt} className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                        {DAY_LABEL[dt]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {SEASONS.map(season => (
                    <tr key={season} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-700">
                        {SEASON_LABEL[season]}
                      </td>
                      {DAY_TYPES.map(dt => (
                        <td key={dt} className="px-4 py-2.5 text-right tabular-nums text-gray-800">
                          {fmtPrice(pricingMap[`${season}_${dt}`] ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* シーズン期間 */}
          {seasons.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">シーズン期間</p>
              <ul className="space-y-1">
                {seasons.map(s => (
                  <li key={s.id} className="flex items-center gap-3 text-sm">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {SEASON_NAME_LABEL[s.name] ?? s.name}
                    </span>
                    <span className="text-gray-700">
                      {s.start_date} 〜 {s.end_date}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </Section>

      {/* 審査アクション */}
      <section className="rounded-xl border-2 border-gray-300 bg-white p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">審査アクション</h2>

        {/* 管理者コメント */}
        <div>
          <label htmlFor="adminComment" className="block text-sm font-medium text-gray-700 mb-1">
            管理者コメント
            <span className="ml-1 text-xs font-normal text-gray-400">（差し戻し時は必須）</span>
          </label>
          <textarea
            id="adminComment"
            value={comment}
            onChange={e => { setComment(e.target.value); setCommentError(""); }}
            placeholder="差し戻し理由や特記事項を入力..."
            rows={4}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-1 ${
              commentError
                ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:border-[#1B4332] focus:ring-[#1B4332]"
            }`}
          />
          {commentError && (
            <p className="mt-1 text-xs text-red-600">{commentError}</p>
          )}
        </div>

        {/* ボタン */}
        <div className="flex flex-wrap gap-3">

          {/* 承認して公開する / 公開中 */}
          {isApproved ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              公開中
            </span>
          ) : (
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              承認して公開する
            </button>
          )}

          {/* 差し戻す */}
          <button
            type="button"
            onClick={handleReject}
            disabled={submitting}
            className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
          >
            差し戻す
          </button>

          {/* 掲載停止にする */}
          <button
            type="button"
            onClick={handleSuspend}
            disabled={submitting}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            掲載停止にする
          </button>

        </div>
      </section>

      {/* トースト通知 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

    </div>
  );
}
