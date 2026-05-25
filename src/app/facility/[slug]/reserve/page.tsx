"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { PriceResult } from "@/lib/pricing";

type FacilityBasic = {
  id: string;
  name: string;
  slug: string;
  facility_images: { url: string; is_hero: boolean }[];
};

type AvailabilityResult = {
  isAvailable: boolean;
  unavailableDates: string[];
};

type PricingApiResponse = {
  pricing: PriceResult | null;
  availability: AvailabilityResult;
};

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function ReserveContent() {
  const params = useParams();
  const slug = params.slug as string;
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [facility, setFacility] = useState<FacilityBasic | null>(null);
  const [facilityLoading, setFacilityLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [checkinDate, setCheckinDate] = useState(searchParams.get("checkin") ?? today());
  const [checkoutDate, setCheckoutDate] = useState(searchParams.get("checkout") ?? tomorrow());
  const [guestCount, setGuestCount] = useState(searchParams.get("guests") ?? "2");
  const [message, setMessage] = useState("");

  const [pricingResult, setPricingResult] = useState<PricingApiResponse | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      setGuestName((prev) => prev || (user.user_metadata?.display_name ?? ""));
      setGuestEmail((prev) => prev || (user.email ?? ""));
    }
  }, [user]);

  // 日付変更時に料金・空室を取得
  useEffect(() => {
    if (!facility || checkinDate >= checkoutDate) {
      setPricingResult(null);
      setPricingError(null);
      return;
    }

    let cancelled = false;
    setPricingLoading(true);
    setPricingError(null);

    fetch(`/api/pricing?facilityId=${facility.id}&checkin=${checkinDate}&checkout=${checkoutDate}`)
      .then((res) => res.json())
      .then((data: PricingApiResponse) => {
        if (!cancelled) setPricingResult(data);
      })
      .catch(() => {
        if (!cancelled) setPricingError("料金の取得に失敗しました。");
      })
      .finally(() => {
        if (!cancelled) setPricingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [facility, checkinDate, checkoutDate]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!guestName.trim()) next.guestName = "お名前を入力してください";
    if (!guestEmail.trim()) {
      next.guestEmail = "メールアドレスを入力してください";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      next.guestEmail = "メールアドレスの形式が正しくありません";
    }
    if (!checkinDate) next.checkinDate = "チェックイン日を入力してください";
    if (!checkoutDate) {
      next.checkoutDate = "チェックアウト日を入力してください";
    } else if (checkinDate && checkinDate >= checkoutDate) {
      next.checkoutDate = "チェックアウト日はチェックイン日より後にしてください";
    }
    const count = Number(guestCount);
    if (!guestCount || isNaN(count) || count < 1) {
      next.guestCount = "人数は1名以上で入力してください";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !facility) return;

    setSubmitting(true);
    const { error } = await supabase.from("reservation_requests").insert({
      facility_id: facility.id,
      user_id: user?.id ?? null,
      guest_name: guestName.trim(),
      guest_email: guestEmail.trim(),
      guest_phone: guestPhone.trim() || null,
      guest_count: Number(guestCount),
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      total_price: pricingResult?.pricing?.totalPrice ?? null,
      message: message.trim() || null,
      status: "pending",
    });

    if (error) {
      setErrors({ submit: "送信に失敗しました。もう一度お試しください。" });
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  }

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
        <Link href="/search" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
          施設を検索する
        </Link>
      </div>
    );
  }

  const heroImage = facility?.facility_images.find((img) => img.is_hero);
  const datesValid = !!checkinDate && !!checkoutDate && checkinDate < checkoutDate;
  const notAvailable =
    datesValid && !!pricingResult && !pricingLoading && !pricingResult.availability.isAvailable;
  const canSubmit = !submitting && !notAvailable;

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900">予約リクエストを送信しました。</p>
          <p className="text-sm text-gray-600">
            施設オーナーが確認後、ご連絡いたします。
          </p>
          <Link
            href={`/facility/${slug}`}
            className="inline-block text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← 施設詳細ページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* 施設情報 */}
      {facility && (
        <Link href={`/facility/${slug}`} className="flex items-center gap-4 mb-8 group">
          <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
            {heroImage ? (
              <Image
                src={heroImage.url}
                alt={facility.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="absolute inset-0 bg-gray-200" />
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">予約先施設</p>
            <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
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
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="山田 太郎"
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
              errors.guestName ? "border-red-400" : "border-gray-300"
            }`}
          />
          {errors.guestName && (
            <p className="mt-1 text-xs text-red-600">{errors.guestName}</p>
          )}
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
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="example@email.com"
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
              errors.guestEmail ? "border-red-400" : "border-gray-300"
            }`}
          />
          {errors.guestEmail && (
            <p className="mt-1 text-xs text-red-600">{errors.guestEmail}</p>
          )}
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
            onChange={(e) => setGuestPhone(e.target.value)}
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
              onChange={(e) => {
                setCheckinDate(e.target.value);
                if (e.target.value >= checkoutDate) {
                  const d = new Date(e.target.value);
                  d.setDate(d.getDate() + 1);
                  setCheckoutDate(d.toISOString().split("T")[0]);
                }
              }}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                errors.checkinDate ? "border-red-400" : "border-gray-300"
              }`}
            />
            {errors.checkinDate && (
              <p className="mt-1 text-xs text-red-600">{errors.checkinDate}</p>
            )}
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
              onChange={(e) => setCheckoutDate(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                errors.checkoutDate ? "border-red-400" : "border-gray-300"
              }`}
            />
            {errors.checkoutDate && (
              <p className="mt-1 text-xs text-red-600">{errors.checkoutDate}</p>
            )}
          </div>
        </div>

        {/* 人数 */}
        <div>
          <label htmlFor="guestCount" className="block text-sm font-medium text-gray-700 mb-1">
            人数 <span className="text-red-500">*</span>
          </label>
          <input
            id="guestCount"
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="2"
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
              errors.guestCount ? "border-red-400" : "border-gray-300"
            }`}
          />
          {errors.guestCount && (
            <p className="mt-1 text-xs text-red-600">{errors.guestCount}</p>
          )}
        </div>

        {/* 料金・空室表示エリア */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">料金・空室状況</p>

          {!datesValid && (
            <p className="text-sm text-gray-400">
              チェックイン・チェックアウト日を入力してください。
            </p>
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
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-500">{pricingResult.pricing.nights}泊</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ¥{pricingResult.pricing.totalPrice.toLocaleString("ja-JP")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">この期間の料金は設定されていません。</p>
              )}

              {pricingResult.availability.isAvailable ? (
                <p className="text-sm font-medium text-green-600">✅ この期間は空室です</p>
              ) : (
                <div className="space-y-0.5">
                  {pricingResult.availability.unavailableDates.map((d) => (
                    <p key={d} className="text-sm font-medium text-red-500">
                      ❌ {d} は予約済みです
                    </p>
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
            onChange={(e) => setMessage(e.target.value)}
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
            <Link
              href={`/facility/${slug}`}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
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
