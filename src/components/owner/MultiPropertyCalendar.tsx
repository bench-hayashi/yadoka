"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getOwnerCalendarData,
  type CalendarCell,
  type OwnerCalendarData,
} from "@/lib/ownerCalendar";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props    = { ownerId: string; initialStartDate?: string };
type Selected = { facilityId: number; facilityName: string; date: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const _today = new Date();
_today.setHours(0, 0, 0, 0);
const TODAY_STR = `${_today.getFullYear()}-${String(_today.getMonth() + 1).padStart(2, "0")}-${String(_today.getDate()).padStart(2, "0")}`;

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"] as const;

// ─── Utilities ────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function parseDateMeta(dateStr: string) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dow = new Date(y, mo - 1, d).getDay();
  return {
    label:   `${mo}/${d}`,
    dow:     WEEKDAY[dow],
    isSun:   dow === 0,
    isSat:   dow === 6,
    isToday: dateStr === TODAY_STR,
  };
}

function fmtDateRange(startDate: string, days: number): string {
  const [y, mo, d] = startDate.split("-").map(Number);
  const end = new Date(y, mo - 1, d + days - 1);
  return `${y}/${mo}/${d} 〜 ${end.getFullYear()}/${end.getMonth() + 1}/${end.getDate()}`;
}

function fmtPrice(price: number | null | undefined): string {
  if (price == null || price === 0) return "―";
  if (price >= 10000) return `${parseFloat((price / 10000).toFixed(1))}万`;
  return `¥${price.toLocaleString()}`;
}

function fmtDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const { dow } = parseDateMeta(dateStr);
  return `${y}/${mo}/${d}（${dow}）`;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ─── Cell content ─────────────────────────────────────────────────────────────

function CellContent({ cell }: { cell: CalendarCell | undefined }) {
  const isAvail = cell?.isAvailable ?? true;

  if (isAvail) {
    return (
      <>
        <span className="text-green-500 text-xs leading-tight">◯</span>
        <span className={`text-[10px] leading-tight ${
          cell?.isOverride ? "text-amber-600 font-bold" : "text-gray-400"
        }`}>
          {fmtPrice(cell?.price)}
        </span>
      </>
    );
  }

  const src = cell?.source ?? "manual";
  const [icon, cls] =
    src === "ical"
      ? ["✕(外)", "text-orange-500"]
      : src === "reservation"
      ? ["✕(予)", "text-blue-500"]
      : ["✕",     "text-gray-400"];

  return (
    <>
      <span className={`text-[11px] font-medium leading-tight ${cls}`}>{icon}</span>
      <span className="text-[10px] leading-tight text-gray-300">―</span>
    </>
  );
}

// ─── Cell Modal ───────────────────────────────────────────────────────────────

type ModalProps = {
  data:    OwnerCalendarData;
  sel:     Selected;
  onClose: () => void;
  onPatch: (facilityId: number, date: string, patch: Partial<CalendarCell>) => void;
};

function CellModal({ data, sel, onClose, onPatch }: ModalProps) {
  const { facilityId, facilityName, date } = sel;
  const cell = data.cells[facilityId]?.[date];

  const isAvail = cell?.isAvailable ?? true;

  const [overrideType,   setOverrideType]   = useState<"flat" | "minimum">(cell?.overrideType ?? "flat");
  const [overrideAmount, setOverrideAmount] = useState(
    cell?.isOverride && cell.overrideType === "flat" ? String(cell.price ?? "") : "",
  );
  const [saving, setSaving] = useState(false);

  const warningSource = !isAvail && (cell?.source === "ical" || cell?.source === "reservation")
    ? cell.source
    : null;

  // ── Availability toggle ──────────────────────────────────────────────────

  async function handleToggle() {
    setSaving(true);
    const newValue = !isAvail;
    const { error } = await supabase
      .from("availability")
      .upsert(
        { facility_id: facilityId, target_date: date, is_available: newValue, source: "manual" },
        { onConflict: "facility_id,target_date" },
      );
    if (!error) {
      onPatch(facilityId, date, { isAvailable: newValue, source: "manual" });
    }
    setSaving(false);
  }

  // ── Override save ────────────────────────────────────────────────────────

  async function handleSaveOverride() {
    const amount = parseInt(overrideAmount, 10);
    if (isNaN(amount) || amount < 0) return;
    setSaving(true);
    const { error } = await supabase
      .from("pricing_overrides")
      .upsert(
        {
          facility_id:     facilityId,
          target_date:     date,
          override_amount: amount,
          override_type:   overrideType,
        },
        { onConflict: "facility_id,target_date" },
      );
    if (!error) {
      const newPrice = overrideType === "flat" ? amount : (cell?.basePrice ?? null);
      onPatch(facilityId, date, { price: newPrice, isOverride: true, overrideType });
    }
    setSaving(false);
  }

  // ── Override remove ──────────────────────────────────────────────────────

  async function handleRemoveOverride() {
    setSaving(true);
    const { error } = await supabase
      .from("pricing_overrides")
      .delete()
      .eq("facility_id", facilityId)
      .eq("target_date", date);
    if (!error) {
      onPatch(facilityId, date, {
        price:        cell?.basePrice ?? null,
        isOverride:   false,
        overrideType: null,
      });
    }
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{facilityName}</p>
            <p className="text-xs text-gray-500">{fmtDate(date)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 mt-0.5 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="divide-y divide-gray-100">

          {/* ── Availability section ────────────────────────────────────── */}
          <div className="px-4 py-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">空室状態</p>

            <div className="flex items-center justify-between">
              <span className="text-sm">
                現在：
                {isAvail ? (
                  <span className="font-medium text-green-600">◯ 空室</span>
                ) : (
                  <span className={`font-medium ${
                    cell?.source === "ical"        ? "text-orange-500"
                    : cell?.source === "reservation" ? "text-blue-500"
                    : "text-gray-500"
                  }`}>
                    ✕ 満室
                    {cell?.source === "ical"        && "（外部）"}
                    {cell?.source === "reservation" && "（予約）"}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleToggle}
                disabled={saving}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <Spinner className="h-3 w-3" />}
                {isAvail ? "満室にする" : "空室にする"}
              </button>
            </div>

            {warningSource && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                ⚠️{" "}
                {warningSource === "ical"
                  ? "この日はiCal連携による満室です。手動で変更できますが、次回同期時に上書きされる場合があります。"
                  : "この日は予約承認による満室です。手動で変更すると予約管理と矛盾する可能性があります。"}
              </p>
            )}
          </div>

          {/* ── Pricing override section ────────────────────────────────── */}
          <div className="px-4 py-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">料金上書き</p>

            <p className="text-xs text-gray-500">
              現在：
              {cell?.isOverride ? (
                <span className="font-medium text-amber-600">
                  {fmtPrice(cell.price)}（上書き中）
                </span>
              ) : (
                <span className="text-gray-700">
                  {fmtPrice(cell?.basePrice)}（シーズンルール）
                </span>
              )}
            </p>

            <div className="flex gap-2">
              <select
                value={overrideType}
                onChange={e => setOverrideType(e.target.value as "flat" | "minimum")}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="flat">定額</option>
                <option value="minimum">ミニマム上書き</option>
              </select>
              <input
                type="number"
                min={0}
                value={overrideAmount}
                onChange={e => setOverrideAmount(e.target.value)}
                placeholder="金額（円）"
                className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSaveOverride}
                disabled={saving || !overrideAmount.trim()}
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <Spinner className="h-3 w-3" />}
                保存
              </button>
            </div>

            {cell?.isOverride && (
              <button
                type="button"
                onClick={handleRemoveOverride}
                disabled={saving}
                className="text-xs text-red-500 hover:text-red-700 underline-offset-2 hover:underline transition-colors disabled:opacity-50"
              >
                上書きを解除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MultiPropertyCalendar ────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function MultiPropertyCalendar({ ownerId, initialStartDate }: Props) {
  const [startDate, setStartDate] = useState(
    initialStartDate && DATE_RE.test(initialStartDate) ? initialStartDate : TODAY_STR,
  );
  const [dayCount,  setDayCount]  = useState<14 | 30>(14);
  const [data,      setData]      = useState<OwnerCalendarData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<Selected | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    getOwnerCalendarData(ownerId, startDate, dayCount).then(result => {
      setData(result);
      setLoading(false);
    });
  }, [ownerId, startDate, dayCount]);

  // ── Patch single cell (avoids full refetch) ────────────────────────────────

  function patchCell(facilityId: number, date: string, patch: Partial<CalendarCell>) {
    setData(prev => {
      if (!prev) return prev;
      const fCells = prev.cells[facilityId] ?? {};
      const existing: CalendarCell = fCells[date] ?? {
        isAvailable: true, source: null, price: null,
        basePrice: null, isOverride: false, overrideType: null,
      };
      return {
        ...prev,
        cells: {
          ...prev.cells,
          [facilityId]: { ...fCells, [date]: { ...existing, ...patch } },
        },
      };
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Period navigation */}
        <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
          <button
            type="button"
            onClick={() => setStartDate(d => addDays(d, -dayCount))}
            className="border-r border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ＜ 前へ
          </button>
          <span className="px-4 py-2 text-xs text-gray-600 tabular-nums">
            {data ? fmtDateRange(startDate, dayCount) : "…"}
          </span>
          <button
            type="button"
            onClick={() => setStartDate(d => addDays(d, dayCount))}
            className="border-l border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            次へ ＞
          </button>
        </div>

        {/* Today */}
        <button
          type="button"
          onClick={() => setStartDate(TODAY_STR)}
          disabled={startDate === TODAY_STR}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          今日
        </button>

        {/* Day count toggle */}
        <div className="ml-auto flex overflow-hidden rounded-lg border border-gray-300">
          {([14, 30] as const).map((n, i) => (
            <button
              key={n}
              type="button"
              onClick={() => setDayCount(n)}
              className={`px-3 py-2 text-xs transition-colors ${
                i === 0 ? "border-r border-gray-300" : ""
              } ${
                dayCount === n
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {n}日
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto rounded-xl border border-gray-200 shadow-sm">

        {/* Loading overlay (re-fetch during navigation) */}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-white/70">
            <Spinner className="h-6 w-6 text-gray-400" />
          </div>
        )}

        {/* Empty state */}
        {!loading && data && data.facilities.length === 0 && (
          <div className="px-6 py-14 text-center text-sm text-gray-400">
            施設が登録されていません
          </div>
        )}

        {data && data.facilities.length > 0 && (
          <table className="border-collapse">
            <thead>
              <tr>
                {/* Facility column header */}
                <th className="sticky left-0 z-20 min-w-[8rem] w-32 border-b border-r-2 border-b-gray-200 border-r-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-500">
                  施設名
                </th>
                {data.dates.map(d => {
                  const { label, dow, isSun, isSat, isToday } = parseDateMeta(d);
                  return (
                    <th
                      key={d}
                      className={`min-w-[3.5rem] border-b border-gray-200 px-1 py-2 text-center select-none ${
                        isToday ? "bg-blue-50" : "bg-gray-50"
                      }`}
                    >
                      <div className={`text-xs font-semibold ${
                        isSun ? "text-red-500" : isSat ? "text-blue-600" : "text-gray-700"
                      }`}>
                        {label}
                      </div>
                      <div className={`text-[10px] font-medium ${
                        isSun ? "text-red-400" : isSat ? "text-blue-400" : "text-gray-400"
                      }`}>
                        {dow}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.facilities.map(f => (
                <tr key={f.id} className="group">
                  {/* Facility name (sticky) */}
                  <td className="sticky left-0 z-10 min-w-[8rem] w-32 border-b border-r-2 border-b-gray-100 border-r-gray-200 bg-white px-3 py-2">
                    <span className="block truncate text-xs font-medium text-gray-700 leading-snug" title={f.name}>
                      {f.name}
                    </span>
                  </td>

                  {/* Date cells */}
                  {data.dates.map(d => {
                    const cell    = data.cells[f.id]?.[d];
                    const isAvail = cell?.isAvailable ?? true;
                    const src     = cell?.source ?? "manual";
                    const { isToday } = parseDateMeta(d);

                    const bg =
                      isToday
                        ? "bg-blue-50/50 hover:bg-blue-100/60"
                        : isAvail
                        ? "bg-white hover:bg-green-50"
                        : src === "ical"
                        ? "bg-orange-50 hover:bg-orange-100"
                        : src === "reservation"
                        ? "bg-blue-50 hover:bg-blue-100"
                        : "bg-gray-50 hover:bg-gray-100";

                    return (
                      <td
                        key={d}
                        onClick={() => setSelected({ facilityId: f.id, facilityName: f.name, date: d })}
                        className={`h-12 min-w-[3.5rem] cursor-pointer border-b border-gray-100 transition-colors ${bg}`}
                      >
                        <div className="flex h-full flex-col items-center justify-center gap-0.5">
                          <CellContent cell={cell} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="text-green-500">◯</span>空室
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-gray-400">✕</span>手動満室
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-orange-500">✕(外)</span>iCal連携
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-blue-500">✕(予)</span>予約承認
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-amber-600 font-bold">4.5万</span>料金上書き中
        </span>
      </div>

      {/* Cell modal */}
      {selected && data && (
        <CellModal
          data={data}
          sel={selected}
          onClose={() => setSelected(null)}
          onPatch={patchCell}
        />
      )}
    </div>
  );
}
