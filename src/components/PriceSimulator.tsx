"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { PriceResult } from "@/lib/pricing";

type AvailabilityResult = {
  isAvailable: boolean;
  unavailableDates: string[];
};

type ApiResponse = {
  pricing: PriceResult | null;
  availability: AvailabilityResult;
};

type Props = {
  facilityId: number;
  facilitySlug: string;
};

const SEASON_LABEL: Record<string, string> = {
  low: "ローシーズン",
  mid: "ミドルシーズン",
  high: "ハイシーズン",
};

const DAY_TYPE_LABEL: Record<string, string> = {
  weekday: "平日",
  weekend: "休日",
};

const WEEKDAY_LABEL = ["日", "月", "火", "水", "木", "金", "土"];

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAY_LABEL[d.getDay()]})`;
}

function buildInquiryUrl(base: string, checkin: string, checkout: string, guests: number): string {
  return `${base}?checkin=${checkin}&checkout=${checkout}&guests=${guests}`;
}

export default function PriceSimulator({ facilityId, facilitySlug }: Props) {
  const [checkin, setCheckin] = useState(today);
  const [checkout, setCheckout] = useState(tomorrow);
  const [guests, setGuests] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  useEffect(() => {
    if (checkin >= checkout) {
      setError("チェックアウトはチェックイン翌日以降を選択してください。");
      setResult(null);
      return;
    }
    setError(null);

    let cancelled = false;
    setLoading(true);

    const url = `/api/pricing?facilityId=${facilityId}&checkin=${checkin}&checkout=${checkout}`;

    fetch(url)
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError("料金の取得に失敗しました。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [facilityId, checkin, checkout]);

  const inquiryBase = `/facility/${facilitySlug}/inquiry`;
  const reserveBase = `/facility/${facilitySlug}/reserve`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
      <h3 className="text-sm font-semibold text-gray-700">料金シミュレーター</h3>

      {/* 入力フォーム */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">チェックイン</label>
            <input
              type="date"
              value={checkin}
              min={today()}
              onChange={(e) => {
                setCheckin(e.target.value);
                if (e.target.value >= checkout) {
                  const d = new Date(e.target.value);
                  d.setDate(d.getDate() + 1);
                  setCheckout(d.toISOString().split("T")[0]);
                }
              }}
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">チェックアウト</label>
            <input
              type="date"
              value={checkout}
              min={checkin}
              onChange={(e) => setCheckout(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">人数</label>
          <input
            type="number"
            value={guests}
            min={1}
            onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
            className="h-10 w-24 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
          />
        </div>
      </div>

      {/* エラー */}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {/* 計算中 */}
      {loading && (
        <p className="text-sm text-gray-400 animate-pulse">計算中...</p>
      )}

      {/* 計算結果 */}
      {!loading && !error && result && result.pricing && (
        <div className="space-y-4">
          {/* サマリー */}
          <div className="space-y-1">
            <p className="text-xs text-gray-400">{result.pricing.nights}泊</p>
            <p className="text-3xl font-bold text-[#1B4332]">
              ¥{result.pricing.totalPrice.toLocaleString("ja-JP")}
            </p>
            <p className="text-xs text-gray-400">
              平均 ¥{Math.round(result.pricing.totalPrice / result.pricing.nights).toLocaleString("ja-JP")} / 泊
            </p>
          </div>

          {/* 空室状況 */}
          {result.availability.isAvailable ? (
            <p className="text-sm text-green-600 font-medium">✅ この期間は空室です</p>
          ) : (
            <div className="space-y-1">
              {result.availability.unavailableDates.map((d) => (
                <p key={d} className="text-sm text-red-500 font-medium">
                  ❌ {formatDate(d)}が予約済みです
                </p>
              ))}
            </div>
          )}

          {/* 日別内訳（開閉式） */}
          <div>
            <button
              onClick={() => setBreakdownOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${breakdownOpen ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              日別内訳を{breakdownOpen ? "閉じる" : "見る"}
            </button>

            {breakdownOpen && (
              <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden text-xs">
                {result.pricing.breakdown.map((b) => (
                  <li key={b.date} className="flex items-center justify-between px-3 py-2 bg-white">
                    <span className="text-gray-600">
                      {formatDate(b.date)}
                    </span>
                    <span className="text-gray-400 mx-2">{SEASON_LABEL[b.season]}・{DAY_TYPE_LABEL[b.dayType]}</span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      ¥{b.price.toLocaleString("ja-JP")}
                      {b.isOverride && <span className="ml-1 text-[#B8860B]">*</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 料金データなし */}
      {!loading && !error && result && !result.pricing && (
        <p className="text-sm text-gray-400">この期間の料金は設定されていません。</p>
      )}

      {/* アクションボタン */}
      <div className="space-y-2 pt-1 border-t border-gray-100">
        <Link
          href={buildInquiryUrl(inquiryBase, checkin, checkout, guests)}
          className="block w-full rounded-xl bg-[#1B4332] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#2D6A4F] transition-colors"
        >
          この条件で問い合わせる
        </Link>
        <Link
          href={buildInquiryUrl(reserveBase, checkin, checkout, guests)}
          className="block w-full rounded-xl border-2 border-[#B8860B] px-4 py-3 text-center text-sm font-semibold text-[#B8860B] hover:bg-[#F5E6CC] transition-colors"
        >
          予約リクエストを送る
        </Link>
      </div>
    </div>
  );
}
