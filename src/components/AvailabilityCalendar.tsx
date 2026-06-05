"use client";

import { useState } from "react";
import { getDayMinPrice } from "@/lib/pricing";

// ─── Types ────────────────────────────────────────────────────────────────────

type AvailabilityEntry = {
  target_date:  string;
  is_available: boolean;
};

type PricingProps = {
  rules:         { season: string; day_type: string; minimum_price: number }[];
  seasons:       { start_date: string; end_date: string; name: string }[];
  simpleSeasons: { month: number; season: string }[];
  overrides:     { target_date: string; override_amount: number }[];
};

type Props = {
  availability: AvailabilityEntry[];
  facilityId?:  number;
  pricing?:     PricingProps;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// ─── Utilities ────────────────────────────────────────────────────────────────

function toYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = Array(firstDay.getDay()).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

function fmtPrice(price: number): string {
  if (price >= 10000) return `${parseFloat((price / 10000).toFixed(1))}万`;
  return `¥${price.toLocaleString()}`;
}

// ─── Cell status ──────────────────────────────────────────────────────────────

type CellStatus = "available" | "unavailable" | "nodata" | "past";

function getCellStatus(
  date:     Date,
  today:    Date,
  availMap: Map<string, boolean>,
): CellStatus {
  if (date < today) return "past";
  const key = toYMD(date);
  if (!availMap.has(key)) return "nodata";
  return availMap.get(key) ? "available" : "unavailable";
}

// ─── MonthCalendar ────────────────────────────────────────────────────────────

function MonthCalendar({
  year,
  month,
  availMap,
  today,
  facilityId,
  pricing,
}: {
  year:        number;
  month:       number;
  availMap:    Map<string, boolean>;
  today:       Date;
  facilityId?: number;
  pricing?:    PricingProps;
}) {
  const cells = buildMonthGrid(year, month);
  const label = `${year}年${month + 1}月`;

  return (
    <div className="flex-1 min-w-0">
      <p className="mb-3 text-center text-sm font-semibold text-gray-700">{label}</p>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden text-xs">
        {/* 曜日ヘッダー */}
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`bg-gray-50 py-1.5 text-center font-medium ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
            }`}
          >
            {w}
          </div>
        ))}

        {/* 日付セル */}
        {cells.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="bg-white py-2 min-h-[3.5rem]" />;
          }

          const dateStr  = toYMD(date);
          const status   = getCellStatus(date, today, availMap);
          const dayOfWeek = date.getDay();

          const bgClass =
            status === "past"
              ? "bg-gray-50"
              : status === "unavailable" || status === "nodata"
              ? "bg-gray-100"
              : "bg-white";

          const dateColor =
            status === "past"
              ? "text-gray-300"
              : dayOfWeek === 0
              ? "text-red-400"
              : dayOfWeek === 6
              ? "text-blue-400"
              : "text-gray-700";

          const price =
            pricing && facilityId && status === "available"
              ? getDayMinPrice(
                  dateStr,
                  facilityId,
                  pricing.seasons,
                  pricing.simpleSeasons,
                  pricing.rules,
                  pricing.overrides,
                )
              : null;

          return (
            <div
              key={dateStr}
              className={`${bgClass} py-1.5 flex flex-col items-center gap-px min-h-[3.5rem]`}
            >
              <span className={`text-xs leading-tight ${dateColor}`}>
                {date.getDate()}
              </span>

              {status === "past" ? (
                <span className="text-gray-200 text-[10px] leading-tight">−</span>
              ) : status === "available" ? (
                <>
                  <span className="text-green-500 font-bold text-xs leading-tight">○</span>
                  <span className="text-[10px] leading-tight text-gray-400 tabular-nums">
                    {price !== null ? fmtPrice(price) : ""}
                  </span>
                </>
              ) : status === "unavailable" ? (
                <>
                  <span className="text-red-400 text-xs leading-tight">✕</span>
                  {pricing && (
                    <span className="text-[10px] leading-tight text-gray-300">―</span>
                  )}
                </>
              ) : (
                <span className="text-gray-300 text-[10px] leading-tight">−</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AvailabilityCalendar ─────────────────────────────────────────────────────

export default function AvailabilityCalendar({ availability, facilityId, pricing }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [baseYear,  setBaseYear]  = useState(today.getFullYear());
  const [baseMonth, setBaseMonth] = useState(today.getMonth());

  const availMap = new Map<string, boolean>(
    availability.map((a) => [a.target_date, a.is_available]),
  );

  const secondYear  = baseMonth === 11 ? baseYear + 1 : baseYear;
  const secondMonth = baseMonth === 11 ? 0 : baseMonth + 1;

  const goPrev = () => {
    if (baseMonth === 0) { setBaseYear(y => y - 1); setBaseMonth(11); }
    else setBaseMonth(m => m - 1);
  };

  const goNext = () => {
    if (baseMonth === 11) { setBaseYear(y => y + 1); setBaseMonth(0); }
    else setBaseMonth(m => m + 1);
  };

  const isCurrentOrFuture =
    baseYear > today.getFullYear() ||
    (baseYear === today.getFullYear() && baseMonth >= today.getMonth());

  return (
    <div className="space-y-4">
      {/* ナビゲーション */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={!isCurrentOrFuture || (baseYear === today.getFullYear() && baseMonth === today.getMonth())}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          前月
        </button>
        <button
          onClick={goNext}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          次月
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 2ヶ月カレンダー */}
      <div className="flex flex-col sm:flex-row gap-6">
        <MonthCalendar
          year={baseYear} month={baseMonth}
          availMap={availMap} today={today}
          facilityId={facilityId} pricing={pricing}
        />
        <MonthCalendar
          year={secondYear} month={secondMonth}
          availMap={availMap} today={today}
          facilityId={facilityId} pricing={pricing}
        />
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-4 pt-1 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="text-green-500 font-bold">○</span> 空室あり
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-400">✕</span> 満室
        </span>
        <span className="flex items-center gap-1">
          <span className="text-gray-300">−</span> データなし
        </span>
      </div>

      {/* 補足テキスト */}
      {pricing && (
        <p className="text-xs text-gray-400 leading-relaxed">
          表示料金は最低料金です。人数・ペットによる料金は料金シミュレーターでご確認ください。
        </p>
      )}
    </div>
  );
}
