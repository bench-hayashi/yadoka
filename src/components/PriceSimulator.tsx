"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { PriceResult } from "@/lib/pricing";

// ─── Types ────────────────────────────────────────────────────────────────────

type AvailabilityResult = {
  isAvailable:      boolean;
  unavailableDates: string[];
};

type ApiResponse = {
  pricing:      PriceResult | null;
  availability: AvailabilityResult;
};

type Props = {
  facilityId:   number;
  facilitySlug: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SEASON_LABEL: Record<string, string> = {
  low:  "ロー",
  mid:  "ミドル",
  high: "ハイ",
};

const DAY_TYPE_LABEL: Record<string, string> = {
  weekday: "平日",
  weekend: "休日",
};

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// タイムゾーン依存を避けるため日付文字列を直接分解
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dow = new Date(year, month - 1, day).getDay();
  return `${month}月${day}日(${WEEKDAY[dow]})`;
}

function buildUrl(
  base:     string,
  checkin:  string,
  checkout: string,
  adults:   number,
  children: number,
  infants:  number,
  pets:     number,
): string {
  const p = new URLSearchParams({
    checkin,
    checkout,
    adults:   String(adults),
    children: String(children),
    infants:  String(infants),
    pets:     String(pets),
  });
  return `${base}?${p}`;
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  label, hint, value, min,
  onDec, onInc,
}: {
  label: string;
  hint:  string;
  value: number;
  min:   number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className="text-[10px] text-gray-400">{hint}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onDec}
          disabled={value <= min}
          className="h-8 w-8 shrink-0 rounded-md border border-gray-200 text-base text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors leading-none"
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
          className="h-8 w-8 shrink-0 rounded-md border border-gray-200 text-base text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors leading-none"
          aria-label={`${label}を増やす`}
        >
          ＋
        </button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PriceSimulator({ facilityId, facilitySlug }: Props) {
  const [checkin,  setCheckin]  = useState(todayStr);
  const [checkout, setCheckout] = useState(tomorrowStr);
  const [adults,   setAdults]   = useState(2);
  const [children, setChildren] = useState(0);
  const [infants,  setInfants]  = useState(0);
  const [pets,     setPets]     = useState(0);

  const [loading,       setLoading]       = useState(false);
  const [result,        setResult]        = useState<ApiResponse | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // 日付または人数が変わるたびに再計算
  useEffect(() => {
    if (checkin >= checkout) {
      setError("チェックアウトはチェックイン翌日以降を選択してください。");
      setResult(null);
      return;
    }
    setError(null);

    let cancelled = false;
    setLoading(true);

    const url = `/api/pricing?facilityId=${facilityId}`
      + `&checkin=${checkin}&checkout=${checkout}`
      + `&adults=${adults}&children=${children}&infants=${infants}&pets=${pets}`;

    fetch(url)
      .then(res => res.json())
      .then((data: ApiResponse) => { if (!cancelled) setResult(data); })
      .catch(() => { if (!cancelled) setError("料金の取得に失敗しました。"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [facilityId, checkin, checkout, adults, children, infants, pets]);

  const inquiryBase = `/facility/${facilitySlug}/inquiry`;
  const reserveBase = `/facility/${facilitySlug}/reserve`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
      <h3 className="text-sm font-semibold text-gray-700">料金シミュレーター</h3>

      {/* ── 日付 ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">チェックイン</label>
          <input
            type="date"
            value={checkin}
            min={todayStr()}
            onChange={e => {
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
            onChange={e => setCheckout(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
          />
        </div>
      </div>

      {/* ── 人数構成 ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stepper
          label="大人"   hint="13歳以上"
          value={adults}   min={1}
          onDec={() => setAdults(v  => Math.max(1, v - 1))}
          onInc={() => setAdults(v  => v + 1)}
        />
        <Stepper
          label="子供"   hint="6〜12歳"
          value={children} min={0}
          onDec={() => setChildren(v => Math.max(0, v - 1))}
          onInc={() => setChildren(v => v + 1)}
        />
        <Stepper
          label="幼児"   hint="0〜5歳"
          value={infants}  min={0}
          onDec={() => setInfants(v  => Math.max(0, v - 1))}
          onInc={() => setInfants(v  => v + 1)}
        />
        <Stepper
          label="ペット" hint="1頭単位"
          value={pets}     min={0}
          onDec={() => setPets(v     => Math.max(0, v - 1))}
          onInc={() => setPets(v     => v + 1)}
        />
      </div>

      {/* ── エラー ────────────────────────────────────────────────────── */}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {/* ── 計算中 ────────────────────────────────────────────────────── */}
      {loading && (
        <p className="text-sm text-gray-400 animate-pulse">計算中...</p>
      )}

      {/* ── 計算結果 ──────────────────────────────────────────────────── */}
      {!loading && !error && result && result.pricing && (
        <div className="space-y-3">

          {/* 合計金額 */}
          <div>
            <p className="text-xs text-gray-400">{result.pricing.nights}泊</p>
            <p className="text-3xl font-bold text-[#1B4332]">
              ¥{result.pricing.totalPrice.toLocaleString("ja-JP")}
            </p>
            <p className="text-xs text-gray-400">
              平均 ¥{Math.round(result.pricing.totalPrice / result.pricing.nights).toLocaleString("ja-JP")} / 泊
            </p>
          </div>

          {/* 人数構成確認バッジ */}
          {(() => {
            const gb = result.pricing.guestBreakdown;
            const items = [
              { label: "大人",   val: gb.adults   },
              { label: "子供",   val: gb.children },
              { label: "幼児",   val: gb.infants  },
              { label: "ペット", val: gb.pets     },
            ].filter(x => x.val > 0);
            return items.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {items.map(({ label, val }) => (
                  <span
                    key={label}
                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                  >
                    {label} {val}
                  </span>
                ))}
              </div>
            ) : null;
          })()}

          {/* 空室状況 */}
          {result.availability.isAvailable ? (
            <p className="text-sm text-green-600 font-medium">✅ この期間は空室です</p>
          ) : (
            <div className="space-y-1">
              {result.availability.unavailableDates.map(d => (
                <p key={d} className="text-sm text-red-500 font-medium">
                  ❌ {formatDate(d)}が予約済みです
                </p>
              ))}
            </div>
          )}

          {/* 日別内訳（開閉式） */}
          <div>
            <button
              type="button"
              onClick={() => setBreakdownOpen(o => !o)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${breakdownOpen ? "rotate-90" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              日別内訳を{breakdownOpen ? "閉じる" : "見る"}
            </button>

            {breakdownOpen && (
              <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden text-xs">
                {result.pricing.breakdown.map(b => (
                  <li key={b.date} className="px-3 py-2.5 bg-white space-y-1">
                    {/* 日付と合計 */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{formatDate(b.date)}</span>
                      <span className="font-semibold text-gray-900 tabular-nums">
                        ¥{b.nightTotal.toLocaleString("ja-JP")}
                        {b.isOverride && (
                          <span
                            className="ml-1 text-[10px] text-[#B8860B]"
                            title={b.overrideType === "flat" ? "定額上書き" : "ミニマム上書き"}
                          >
                            ＊
                          </span>
                        )}
                      </span>
                    </div>
                    {/* シーズン・内訳 */}
                    <div className="flex items-center justify-between text-gray-400">
                      <span>{SEASON_LABEL[b.season]} · {DAY_TYPE_LABEL[b.dayType]}</span>
                      <span className="tabular-nums flex gap-2">
                        {b.guestCharge > 0 && (
                          <span>人数 ¥{b.guestCharge.toLocaleString("ja-JP")}</span>
                        )}
                        {b.petCharge > 0 && (
                          <span>ペット ¥{b.petCharge.toLocaleString("ja-JP")}</span>
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── 料金データなし ─────────────────────────────────────────────── */}
      {!loading && !error && result && !result.pricing && (
        <p className="text-sm text-gray-400">この期間の料金は設定されていません。</p>
      )}

      {/* ── アクションボタン ──────────────────────────────────────────── */}
      <div className="space-y-2 pt-1 border-t border-gray-100">
        <Link
          href={buildUrl(inquiryBase, checkin, checkout, adults, children, infants, pets)}
          className="block w-full rounded-xl bg-[#1B4332] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#2D6A4F] transition-colors"
        >
          この条件で問い合わせる
        </Link>
        <Link
          href={buildUrl(reserveBase, checkin, checkout, adults, children, infants, pets)}
          className="block w-full rounded-xl border-2 border-[#B8860B] px-4 py-3 text-center text-sm font-semibold text-[#B8860B] hover:bg-[#F5E6CC] transition-colors"
        >
          予約リクエストを送る
        </Link>
      </div>
    </div>
  );
}
