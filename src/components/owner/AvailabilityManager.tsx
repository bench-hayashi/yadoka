"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type AvailEntry = { id: string | null; is_available: boolean };
type AvailMap   = Map<string, AvailEntry>;

type Props = { facilityId: string };

// ── Date helpers ──────────────────────────────────────────────────────────────

// Use local date parts to avoid UTC/timezone mismatches
function fmt(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function mkey(d: Date): string {
  return fmt(new Date(d.getFullYear(), d.getMonth(), 1));
}

function daysIn(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function monthLabel(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const TODAY_STR = fmt(TODAY);

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// ── CalendarMonth ─────────────────────────────────────────────────────────────

type CalendarProps = {
  month:     Date;
  avail:     AvailMap;
  toggling:  Set<string>;
  bulking:   boolean;
  onToggle:  (dateStr: string) => void;
  onBulk:    (month: Date, isAvailable: boolean) => void;
};

function CalendarMonth({ month, avail, toggling, bulking, onToggle, onBulk }: CalendarProps) {
  const year  = month.getFullYear();
  const mo    = month.getMonth();
  const first = new Date(year, mo, 1).getDay(); // 0=Sun
  const total = daysIn(month);

  const cells: (number | null)[] = [
    ...Array<null>(first).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Month header + bulk buttons */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{monthLabel(month)}</h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onBulk(month, true)}
            disabled={bulking}
            className="rounded-md bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            すべて空室にする
          </button>
          <button
            type="button"
            onClick={() => onBulk(month, false)}
            disabled={bulking}
            className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            すべて満室にする
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-2 text-center text-xs font-medium ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`blank-${i}`} className="aspect-square border-t border-gray-50" />;
          }
          const ds      = `${year}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPast  = ds < TODAY_STR;
          const entry   = avail.get(ds);
          // Dates without a record are treated as available by default
          const isAvail = entry ? entry.is_available : true;
          const isBusy  = !isAvail;
          const inFlight = toggling.has(ds);

          return (
            <button
              key={ds}
              type="button"
              onClick={() => !isPast && !inFlight && onToggle(ds)}
              disabled={isPast}
              title={ds}
              className={[
                "aspect-square flex flex-col items-center justify-center gap-0.5 text-xs border-t border-gray-50 select-none transition-colors",
                isPast
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : isBusy
                  ? "bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer"
                  : "bg-white text-green-600 hover:bg-green-50 cursor-pointer",
                inFlight ? "opacity-50" : "",
              ].filter(Boolean).join(" ")}
            >
              <span className="font-medium leading-none">{day}</span>
              {!isPast && (
                <span className="leading-none text-[10px]">{isBusy ? "✕" : "◯"}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── AvailabilityManager ───────────────────────────────────────────────────────

export default function AvailabilityManager({ facilityId }: Props) {
  const [base,     setBase]     = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [avail,    setAvail]    = useState<AvailMap>(new Map());
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [bulking,  setBulking]  = useState(false);
  const fetchedRef = useRef<Set<string>>(new Set());

  const months = [base, addMonths(base, 1), addMonths(base, 2)];

  // ── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const toFetch = months.filter(m => !fetchedRef.current.has(mkey(m)));
    if (toFetch.length === 0) return;

    // Mark fetched immediately to prevent concurrent duplicate requests
    toFetch.forEach(m => fetchedRef.current.add(mkey(m)));

    const rangeStart = mkey(toFetch[0]) + "-01";
    const lastMonth  = toFetch[toFetch.length - 1];
    const rangeEnd   = fmt(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0));

    supabase
      .from("availability")
      .select("id, target_date, is_available")
      .eq("facility_id", facilityId)
      .gte("target_date", rangeStart)
      .lte("target_date", rangeEnd)
      .then(({ data }) => {
        if (!data) return;
        setAvail(prev => {
          const next = new Map(prev);
          for (const row of data) {
            next.set(row.target_date, { id: row.id, is_available: !!row.is_available });
          }
          return next;
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, facilityId]);

  // ── Toggle ───────────────────────────────────────────────────────────────

  async function toggle(ds: string) {
    const current  = avail.get(ds);
    const newValue = !(current?.is_available ?? true);

    // Optimistic update
    setToggling(prev => new Set(prev).add(ds));
    setAvail(prev => {
      const next = new Map(prev);
      next.set(ds, { id: current?.id ?? null, is_available: newValue });
      return next;
    });

    if (current?.id) {
      await supabase
        .from("availability")
        .update({ is_available: newValue })
        .eq("id", current.id);
    } else {
      const { data } = await supabase
        .from("availability")
        .insert({
          facility_id:  facilityId,
          target_date:  ds,
          is_available: newValue,
          source:       "manual",
        })
        .select("id")
        .single();
      if (data?.id) {
        setAvail(prev => {
          const next = new Map(prev);
          next.set(ds, { id: data.id, is_available: newValue });
          return next;
        });
      }
    }

    setToggling(prev => {
      const next = new Set(prev);
      next.delete(ds);
      return next;
    });
  }

  // ── Bulk set ─────────────────────────────────────────────────────────────

  async function bulkSet(month: Date, isAvailable: boolean) {
    setBulking(true);

    const year = month.getFullYear();
    const mo   = month.getMonth();
    // Only future dates (today and forward)
    const dates = Array.from({ length: daysIn(month) }, (_, i) => {
      const d = new Date(year, mo, i + 1);
      return d >= TODAY ? fmt(d) : null;
    }).filter((d): d is string => d !== null);

    if (dates.length === 0) { setBulking(false); return; }

    // Optimistic update
    setAvail(prev => {
      const next = new Map(prev);
      for (const ds of dates) {
        next.set(ds, { id: prev.get(ds)?.id ?? null, is_available: isAvailable });
      }
      return next;
    });

    const start = `${mkey(month)}-01`;
    const end   = fmt(new Date(year, mo + 1, 0));

    // Delete existing records for the month, then re-insert future dates
    await supabase
      .from("availability")
      .delete()
      .eq("facility_id", facilityId)
      .gte("target_date", start)
      .lte("target_date", end);

    const { data } = await supabase
      .from("availability")
      .insert(
        dates.map(ds => ({
          facility_id:  facilityId,
          target_date:  ds,
          is_available: isAvailable,
          source:       "manual",
        }))
      )
      .select("id, target_date");

    // Update IDs from insert response
    if (data) {
      setAvail(prev => {
        const next = new Map(prev);
        for (const row of data) {
          next.set(row.target_date, { id: row.id, is_available: isAvailable });
        }
        return next;
      });
    }

    setBulking(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setBase(b => addMonths(b, -1))}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          前月
        </button>
        <span className="text-sm text-gray-500">
          {monthLabel(base)}〜{monthLabel(addMonths(base, 2))}
        </span>
        <button
          type="button"
          onClick={() => setBase(b => addMonths(b, 1))}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          次月
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded border border-green-200 bg-white text-green-600 text-[10px]">◯</span>
          空室（クリックで切り替え）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded border border-red-200 bg-red-50 text-red-500 text-[10px]">✕</span>
          満室
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-5 w-5 rounded bg-gray-100 border border-gray-200" />
          過去日（操作不可）
        </span>
      </div>

      {/* 3-month calendars */}
      <div className="space-y-4">
        {months.map(m => (
          <CalendarMonth
            key={mkey(m)}
            month={m}
            avail={avail}
            toggling={toggling}
            bulking={bulking}
            onToggle={toggle}
            onBulk={bulkSet}
          />
        ))}
      </div>
    </div>
  );
}
