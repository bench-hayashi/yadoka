"use client";

import { useState } from "react";

type AvailabilityEntry = {
  target_date: string;
  is_available: boolean;
};

type Props = {
  availability: AvailabilityEntry[];
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function toYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = Array(firstDay.getDay()).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

type CellStatus = "available" | "unavailable" | "nodata" | "past";

function getCellStatus(
  date: Date,
  today: Date,
  availMap: Map<string, boolean>,
): CellStatus {
  if (date < today) return "past";
  const key = toYMD(date);
  if (!availMap.has(key)) return "nodata";
  return availMap.get(key) ? "available" : "unavailable";
}

function MonthCalendar({
  year,
  month,
  availMap,
  today,
}: {
  year: number;
  month: number;
  availMap: Map<string, boolean>;
  today: Date;
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
            return <div key={`empty-${i}`} className="bg-white py-2" />;
          }
          const status = getCellStatus(date, today, availMap);
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

          return (
            <div key={toYMD(date)} className={`${bgClass} py-2 flex flex-col items-center gap-0.5`}>
              <span className={`text-xs ${dateColor}`}>{date.getDate()}</span>
              {status === "past" ? (
                <span className="text-gray-200 text-xs">−</span>
              ) : status === "available" ? (
                <span className="text-green-500 font-bold text-xs">○</span>
              ) : status === "unavailable" ? (
                <span className="text-red-400 text-xs">✕</span>
              ) : (
                <span className="text-gray-300 text-xs">−</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AvailabilityCalendar({ availability }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [baseYear, setBaseYear] = useState(today.getFullYear());
  const [baseMonth, setBaseMonth] = useState(today.getMonth());

  const availMap = new Map<string, boolean>(
    availability.map((a) => [a.target_date, a.is_available]),
  );

  const secondYear = baseMonth === 11 ? baseYear + 1 : baseYear;
  const secondMonth = baseMonth === 11 ? 0 : baseMonth + 1;

  const goPrev = () => {
    if (baseMonth === 0) {
      setBaseYear((y) => y - 1);
      setBaseMonth(11);
    } else {
      setBaseMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (baseMonth === 11) {
      setBaseYear((y) => y + 1);
      setBaseMonth(0);
    } else {
      setBaseMonth((m) => m + 1);
    }
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
        <MonthCalendar year={baseYear} month={baseMonth} availMap={availMap} today={today} />
        <MonthCalendar year={secondYear} month={secondMonth} availMap={availMap} today={today} />
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-4 pt-1 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="text-green-500 font-bold">○</span> 空室あり</span>
        <span className="flex items-center gap-1"><span className="text-red-400">✕</span> 満室</span>
        <span className="flex items-center gap-1"><span className="text-gray-300">−</span> データなし</span>
      </div>
    </div>
  );
}
