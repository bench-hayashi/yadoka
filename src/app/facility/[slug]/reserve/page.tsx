"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { PriceResult } from "@/lib/pricing";

// ─── Types ────────────────────────────────────────────────────────────────────

type FacilityBasic = {
  id: string;
  name: string;
  slug: string;
  facility_images: { url: string; is_hero: boolean }[];
};

type AvailabilityResult = {
  isAvailable:      boolean;
  unavailableDates: string[];
};

type PricingApiResponse = {
  pricing:      PriceResult | null;
  availability: AvailabilityResult;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  id, label, hint, value, min, required,
  onDec, onInc,
}: {
  id:       string;
  label:    string;
  hint:     string;
  value:    number;
  min:      number;
  required?: boolean;
  onDec:    () => void;
  onInc:    () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        <span className="ml-2 text-xs text-gray-400">{hint}</span>
      </div>
      <div className="flex items-center gap-3" id={id}>
        <button
          type="button"
          onClick={onDec}
          disabled={value <= min}
          className="h-8 w-8 rounded-md border border-gray-300 text-base text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors leading-none"
          aria-label={`${label}を減らす`}
        >
          −
        </button>
        <span className="w-5 text-center text-sm tabular-nums font-medium text-gray-900">
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          className="h-8 w-8 rounded-md border border-gray-300 text-base text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors leading-none"
          aria-label={`${label}を増やす`}
        >
          ＋
        </button>
      </div>
    </div>
  );
}

// ─── ReserveContent ───────────────────────────────────────────────────────────

function ReserveContent() {
  const params      = useParams();
  const slug        = params.slug as string;
  const sp          = useSearchParams();
  const { user }    = useAuth();

  // ── 施設 ──
  const [facility,        setFacility]        = useState<FacilityBasic | null>(null);
  const [facilityLoading, setFacilityLoading] = useState(true);
  const [notFound,        setNotFound]        = useState(false);

  // ── フォーム入力 ──
  const [guestName,  setGuestName]  = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [message,    setMessage]    = useState("");

  // 日付（URLパラメータから初期化）
  const [checkinDate,  setCheckinDate]  = useState(sp.get("checkin")  ?? today());
  const [checkoutDate, setCheckoutDate] = useState(sp.get("checkout") ?? tomorrow());

  // 人数（URLパラメータから初期化。旧 ?guests= にもフォールバック）
  const [adults,   setAdults]   = useState(() => Math.max(1, Number(sp.get("adults")   ?? sp.get("guests") ?? "2")));
  const [children, setChildren] = useState(() => Math.max(0, Number(sp.get("children") ?? "0")));
  const [infants,  setInfants]  = useState(() => Math.max(0, Number(sp.get("infants")  ?? "0")));
  const [pets,     setPets]     = useState(() => Math.max(0, Number(sp.get("pets")     ?? "0")));

  // ── 料金・空室 ──
  const [pricingResult,  setPricingResult]  = useState<PricingApiResponse | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError,   setPricingError]   = useState<string | null>(null);

  // ── 送信 ──
  const [submitted,  setSubmitted]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  // 施設取得
  useEffect(() => {
    supabase
      .from("facilities")
      .select("id, name, slug, facility_images(url, is_hero)")
      .eq("slug", slug)
      .eq("is_published", true)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        if (!data) setNotFound(true);
        else setFacility(data);
        setFacilityLoading(false);
      });
  }, [slug]);

  // ユーザー情報自動入力
  useEffect(() => {
    if (user) {
      setGuestName( prev => prev || (user.user_metadata?.display_name ?? ""));
      setGuestEmail(prev => prev || (user.email ?? ""));
    }
  }, [user]);

  // 日付または人数が変わるたびに料金・空室を取得
  useEffect(() => {
    if (!facility || checkinDate >= checkoutDate) {
      setPricingResult(null);
      setPricingError(null);
      return;
    }

    let cancelled = false;
    setPricingLoading(true);
    setPricingError(null);

    const url = `/api/pricing?facilityId=${facility.id}`
      + `&checkin=${checkinDate}&checkout=${checkoutDate}`
      + `&adults=${adults}&children=${children}&infants=${infants}&pets=${pets}`;

    fetch(url)
      .then(res => res.json())
      .then((data: PricingApiResponse) => { if (!cancelled) setPricingResult(data); })
      .catch(() => { if (!cancelled) setPricingError("料金の取得に失敗しました。"); })
      .finally(() => { if (!cancelled) setPricingLoading(false); });

    return () => { cancelled = true; };
  }, [facility, checkinDate, checkoutDate, adults, children, infants, pets]);

  // ── バリデーション ──────────────────────────────────────────────────────────

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!guestName.trim())  next.guestName  = "お名前を入力してください";
    if (!guestEmail.trim()) {
      next.guestEmail = "メールアドレスを入力してください";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      next.guestEmail = "メールアドレスの形式が正しくありません";
    }
    if (!checkinDate)  next.checkinDate  = "チェックイン日を入力してください";
    if (!checkoutDate) {
      next.checkoutDate = "チェックアウト日を入力してください";
    } else if (checkinDate && checkinDate >= checkoutDate) {
      next.checkoutDate = "チェックアウト日はチェックイン日より後にしてください";
    }
    if (adults < 1) next.adults = "大人は1名以上必要です";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── 送信 ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !facility) return;

    setSubmitting(true);
    const guestCount = adults + children + infants + pets;

    // reservation_requests テーブルに保存
    // 注意: adults_count, children_count, infants_count, pets_count カラムは
    //       DBマイグレーションで追加が必要
    const { error } = await supabase.from("reservation_requests").insert({
      facility_id:    facility.id,
      user_id:        user?.id ?? null,
      guest_name:     guestName.trim(),
      guest_email:    guestEmail.trim(),
      guest_phone:    guestPhone.trim() || null,
      guest_count:    guestCount,
      adults_count:   adults,
      children_count: children,
      infants_count:  infants,
      pets_count:     pets,
      checkin_date:   checkinDate,
      checkout_date:  checkoutDate,
      total_price:    pricingResult?.pricing?.totalPrice ?? null,
      message:        message.trim() || null,
      status:         "pending",
    });

    if (error) {
      setErrors({ submit: "送信に失敗しました。もう一度お試しください。" });
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  // ── ローディング・not found ─────────────────────────────────────────────────

  if (facilityLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-gray-500 mb-4">施設が見つかりませんでした。</p>
        <Link href="/search" className="text-sm text-[#1B4332] hover:text-[#2D6A4F] transition-colors">
          施設を検索する
        </Link>
      </div>
    );
  }

  const heroImage    = facility?.facility_images.find(img => img.is_hero);
  const datesValid   = !!checkinDate && !!checkoutDate && checkinDate < checkoutDate;
  const notAvailable = datesValid && !!pricingResult && !pricingLoading && !pricingResult.availability.isAvailable;
  const canSubmit    = !submitting && !notAvailable;

  // ── 送信完了 ────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900">予約リクエストを送信しました。</p>
          <p className="text-sm text-gray-600">施設オーナーが確認後、ご連絡いたします。</p>
          <Link href={`/facility/${slug}`} className="inline-block text-sm text-[#1B4332] hover:text-[#2D6A4F] transition-colors">
            ← 施設詳細ページに戻る
          </Link>
        </div>
      </div>
    );
  }

  // ── フォーム ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

      {/* 施設情報 */}
      {facility && (
        <Link href={`/facility/${slug}`} className="flex items-center gap-4 mb-8 group">
          <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
            {heroImage ? (
              <Image src={heroImage.url} alt={facility.name} fill className="object-cover" sizes="80px" />
            ) : (
              <div className="absolute inset-0 bg-gray-200" />
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">予約先施設</p>
            <p className="font-semibold text-gray-900 group-hover:text-[#1B4332] transition-colors">
              {facility.name}
            </p>
          </div>
        </Link>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-8">予約リクエスト</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* お名前 */}
        <div>
          <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1">
            お名前 <span className="text-red-500">*</span>
          </label>
          <input
            id="guestName"
            type="text"
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            placeholder="山田 太郎"
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors.guestName ? "border-red-400" : "border-gray-300"}`}
          />
          {errors.guestName && <p className="mt-1 text-xs text-red-600">{errors.guestName}</p>}
        </div>

        {/* メールアドレス */}
        <div>
          <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            id="guestEmail"
            type="email"
            value={guestEmail}
            onChange={e => setGuestEmail(e.target.value)}
            placeholder="example@email.com"
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors.guestEmail ? "border-red-400" : "border-gray-300"}`}
          />
          {errors.guestEmail && <p className="mt-1 text-xs text-red-600">{errors.guestEmail}</p>}
        </div>

        {/* 電話番号 */}
        <div>
          <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700 mb-1">
            電話番号
            <span className="ml-2 text-xs font-normal text-gray-400">任意</span>
          </label>
          <input
            id="guestPhone"
            type="tel"
            value={guestPhone}
            onChange={e => setGuestPhone(e.target.value)}
            placeholder="090-0000-0000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        {/* 日付 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="checkinDate" className="block text-sm font-medium text-gray-700 mb-1">
              チェックイン日 <span className="text-red-500">*</span>
            </label>
            <input
              id="checkinDate"
              type="date"
              value={checkinDate}
              onChange={e => {
                setCheckinDate(e.target.value);
                if (e.target.value >= checkoutDate) {
                  const d = new Date(e.target.value);
                  d.setDate(d.getDate() + 1);
                  setCheckoutDate(d.toISOString().split("T")[0]);
                }
              }}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors.checkinDate ? "border-red-400" : "border-gray-300"}`}
            />
            {errors.checkinDate && <p className="mt-1 text-xs text-red-600">{errors.checkinDate}</p>}
          </div>
          <div>
            <label htmlFor="checkoutDate" className="block text-sm font-medium text-gray-700 mb-1">
              チェックアウト日 <span className="text-red-500">*</span>
            </label>
            <input
              id="checkoutDate"
              type="date"
              value={checkoutDate}
              min={checkinDate}
              onChange={e => setCheckoutDate(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors.checkoutDate ? "border-red-400" : "border-gray-300"}`}
            />
            {errors.checkoutDate && <p className="mt-1 text-xs text-red-600">{errors.checkoutDate}</p>}
          </div>
        </div>

        {/* 人数構成 */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            人数構成 <span className="text-red-500">*</span>
          </p>
          <div className="rounded-md border border-gray-300 px-4 divide-y divide-gray-100">
            <Stepper
              id="adults"  label="大人"   hint="13歳以上" value={adults}   min={1} required
              onDec={() => setAdults(v   => Math.max(1, v - 1))}
              onInc={() => setAdults(v   => v + 1)}
            />
            <Stepper
              id="children" label="子供" hint="6〜12歳"  value={children} min={0}
              onDec={() => setChildren(v => Math.max(0, v - 1))}
              onInc={() => setChildren(v => v + 1)}
            />
            <Stepper
              id="infants"  label="幼児" hint="0〜5歳"   value={infants}  min={0}
              onDec={() => setInfants(v  => Math.max(0, v - 1))}
              onInc={() => setInfants(v  => v + 1)}
            />
            <Stepper
              id="pets"     label="ペット" hint="1頭単位" value={pets}    min={0}
              onDec={() => setPets(v     => Math.max(0, v - 1))}
              onInc={() => setPets(v     => v + 1)}
            />
          </div>
          {errors.adults && <p className="mt-1 text-xs text-red-600">{errors.adults}</p>}
        </div>

        {/* 料金・空室 */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">料金・空室状況</p>

          {!datesValid && (
            <p className="text-sm text-gray-400">チェックイン・チェックアウト日を入力してください。</p>
          )}
          {datesValid && pricingLoading && (
            <p className="text-sm text-gray-400 animate-pulse">計算中...</p>
          )}
          {datesValid && pricingError && (
            <p className="text-sm text-red-600">{pricingError}</p>
          )}
          {datesValid && !pricingLoading && !pricingError && pricingResult && (
            <div className="space-y-3">
              {pricingResult.pricing ? (
                <div>
                  <p className="text-xs text-gray-500">{pricingResult.pricing.nights}泊</p>
                  <p className="text-2xl font-bold text-[#1B4332]">
                    ¥{pricingResult.pricing.totalPrice.toLocaleString("ja-JP")}
                  </p>
                  {/* 人数構成確認バッジ */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[
                      { label: "大人",   val: pricingResult.pricing.guestBreakdown.adults   },
                      { label: "子供",   val: pricingResult.pricing.guestBreakdown.children },
                      { label: "幼児",   val: pricingResult.pricing.guestBreakdown.infants  },
                      { label: "ペット", val: pricingResult.pricing.guestBreakdown.pets     },
                    ]
                      .filter(x => x.val > 0)
                      .map(({ label, val }) => (
                        <span key={label} className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600">
                          {label} {val}
                        </span>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">この期間の料金は設定されていません。</p>
              )}

              {pricingResult.availability.isAvailable ? (
                <p className="text-sm font-medium text-green-600">✅ この期間は空室です</p>
              ) : (
                <div className="space-y-0.5">
                  {pricingResult.availability.unavailableDates.map(d => (
                    <p key={d} className="text-sm font-medium text-red-500">❌ {d} は予約済みです</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* メッセージ */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            メッセージ
            <span className="ml-2 text-xs font-normal text-gray-400">任意</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder="ご要望・ご質問などがあればご記入ください"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>

        {/* 送信エラー */}
        {errors.submit && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {errors.submit}
          </p>
        )}

        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 bg-gray-900 text-white py-3 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "送信中..." : "予約リクエストを送信する"}
            </button>
            <Link href={`/facility/${slug}`} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              キャンセル
            </Link>
          </div>
          {notAvailable && (
            <p className="text-xs text-red-500">
              この期間は予約済みのため送信できません。日程を変更してください。
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReservePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center text-gray-400">
          読み込み中...
        </div>
      }
    >
      <ReserveContent />
    </Suspense>
  );
}
