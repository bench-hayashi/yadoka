"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type AvailEntry = { id: string | null; is_available: boolean; source: string | null };
type AvailMap   = Map<string, AvailEntry>;

type ImportSource = {
  id:             string;
  name:           string;
  url:            string;
  last_synced_at: string | null;
};

type SyncSourceResult = {
  name:   string;
  url:    string;
  status: "ok" | "error";
  count:  number;
  error?: string;
};

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

function fmtSyncTime(iso: string | null): string {
  if (!iso) return "未同期";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
          const ds       = `${year}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPast   = ds < TODAY_STR;
          const entry    = avail.get(ds);
          // Dates without a record are treated as available by default
          const isAvail  = entry ? entry.is_available : true;
          const isBusy   = !isAvail;
          const isIcal   = isBusy && entry?.source === "ical";
          const inFlight = toggling.has(ds);

          return (
            <button
              key={ds}
              type="button"
              onClick={() => !isPast && !inFlight && onToggle(ds)}
              disabled={isPast}
              title={isIcal ? `${ds}（iCal連携）` : ds}
              className={[
                "aspect-square flex flex-col items-center justify-center gap-0.5 text-xs border-t border-gray-50 select-none transition-colors",
                isPast
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : isIcal
                  ? "bg-amber-50 text-amber-600 hover:bg-amber-100 cursor-pointer"
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
  // Calendar state
  const [base,       setBase]       = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [avail,      setAvail]      = useState<AvailMap>(new Map());
  const [toggling,   setToggling]   = useState<Set<string>>(new Set());
  const [bulking,    setBulking]    = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchedRef = useRef<Set<string>>(new Set());

  // iCal state
  const [exportUrl,     setExportUrl]     = useState("");
  const [exportCopied,  setExportCopied]  = useState(false);
  const [importSources, setImportSources] = useState<ImportSource[]>([]);
  const [syncing,       setSyncing]       = useState(false);
  const [syncResults,   setSyncResults]   = useState<SyncSourceResult[] | null>(null);
  const [newName,       setNewName]       = useState("");
  const [newUrl,        setNewUrl]        = useState("");
  const [adding,        setAdding]        = useState(false);

  const months = [base, addMonths(base, 1), addMonths(base, 2)];

  // ── Export URL ───────────────────────────────────────────────────────────

  useEffect(() => {
    setExportUrl(`${window.location.origin}/api/ical/${facilityId}`);
  }, [facilityId]);

  // ── Load import sources ──────────────────────────────────────────────────

  async function loadSources() {
    const { data } = await supabase
      .from("ical_import_sources")
      .select("id, name, url, last_synced_at")
      .eq("facility_id", facilityId)
      .order("created_at");
    setImportSources(data ?? []);
  }

  useEffect(() => {
    loadSources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  // ── Fetch availability ───────────────────────────────────────────────────

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
      .select("id, target_date, is_available, source")
      .eq("facility_id", facilityId)
      .gte("target_date", rangeStart)
      .lte("target_date", rangeEnd)
      .then(({ data }) => {
        if (!data) return;
        setAvail(prev => {
          const next = new Map(prev);
          for (const row of data) {
            next.set(row.target_date, {
              id:           row.id,
              is_available: !!row.is_available,
              source:       row.source ?? null,
            });
          }
          return next;
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, facilityId, refreshKey]);

  // ── iCal: Copy export URL ────────────────────────────────────────────────

  function copyExportUrl() {
    navigator.clipboard.writeText(exportUrl).then(() => {
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    });
  }

  // ── iCal: Add source ─────────────────────────────────────────────────────

  async function addSource() {
    const name = newName.trim();
    const url  = newUrl.trim();
    if (!name || !url) return;

    setAdding(true);
    await supabase
      .from("ical_import_sources")
      .insert({ facility_id: facilityId, name, url });
    setNewName("");
    setNewUrl("");
    await loadSources();
    setAdding(false);
  }

  // ── iCal: Delete source ──────────────────────────────────────────────────

  async function deleteSource(id: string) {
    await supabase.from("ical_import_sources").delete().eq("id", id);
    await loadSources();
  }

  // ── iCal: Sync all ───────────────────────────────────────────────────────

  async function syncAll() {
    setSyncing(true);
    setSyncResults(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setSyncing(false);
      return;
    }

    try {
      const res  = await fetch("/api/ical/sync", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ facilityId }),
      });
      const json = await res.json();
      setSyncResults(json.sources ?? []);
    } catch {
      setSyncResults([]);
    }

    // Reload availability
    fetchedRef.current = new Set();
    setAvail(new Map());
    setRefreshKey(k => k + 1);

    await loadSources();
    setSyncing(false);
  }

  // ── Toggle ───────────────────────────────────────────────────────────────

  async function toggle(ds: string) {
    const current  = avail.get(ds);
    const newValue = !(current?.is_available ?? true);

    // Optimistic update
    setToggling(prev => new Set(prev).add(ds));
    setAvail(prev => {
      const next = new Map(prev);
      next.set(ds, { id: current?.id ?? null, is_available: newValue, source: current?.source ?? null });
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
          next.set(ds, { id: data.id, is_available: newValue, source: "manual" });
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
        next.set(ds, { id: prev.get(ds)?.id ?? null, is_available: isAvailable, source: "manual" });
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
          next.set(row.target_date, { id: row.id, is_available: isAvailable, source: "manual" });
        }
        return next;
      });
    }

    setBulking(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── iCal export ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">iCalエクスポート</h3>
        <p className="text-xs text-gray-500">
          このURLを他の予約サイトに登録すると、YADOKAの予約状況を同期できます。
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={exportUrl}
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 font-mono"
          />
          <button
            type="button"
            onClick={copyExportUrl}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {exportCopied ? "コピーしました" : "コピー"}
          </button>
        </div>
      </div>

      {/* ── iCal import ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">iCalインポート</h3>
          <p className="text-xs text-gray-500">
            各予約サイトのiCal URLを登録してください。1つの施設に複数サイトの
            URLを登録できます。登録したすべてのサイトの予約日が満室になります。
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            ⚠️ 必ず該当する物件のURLを登録してください。物件IDの自動照合は
            行われないため、別物件のURLを登録すると誤った日がブロックされます。
          </p>
        </div>

        {/* Registered sources list */}
        {importSources.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {importSources.map(src => (
              <li key={src.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{src.name}</p>
                  <p className="text-xs text-gray-400 truncate font-mono">{src.url}</p>
                  <p className="text-xs text-gray-400">最終同期 {fmtSyncTime(src.last_synced_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteSource(src.id)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add source form */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">iCal元を追加</p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="サイト名（例：Airbnb）"
              className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="iCal URL"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addSource}
              disabled={adding || !newName.trim() || !newUrl.trim()}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              追加
            </button>
          </div>
        </div>

        {/* Sync button + results */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={syncAll}
            disabled={syncing || importSources.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {syncing && (
              <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {syncing ? "同期中..." : "すべて同期"}
          </button>

          {syncResults && syncResults.length > 0 && (
            <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1">
              {syncResults.map((r, i) => (
                <p key={i} className="text-xs">
                  <span className="font-medium text-gray-800">{r.name}</span>
                  {r.status === "ok"
                    ? <span className="text-green-600">：{r.count}件同期</span>
                    : <span className="text-red-600">：取得失敗</span>
                  }
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
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

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded border border-green-200 bg-white text-green-600 text-[10px]">◯</span>
          空室（クリックで切り替え）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded border border-red-200 bg-red-50 text-red-500 text-[10px]">✕</span>
          満室（手動）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded border border-amber-200 bg-amber-50 text-amber-600 text-[10px]">✕</span>
          満室（iCal連携）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-5 w-5 rounded bg-gray-100 border border-gray-200" />
          過去日（操作不可）
        </span>
      </div>

      {/* ── 3-month calendars ────────────────────────────────────────────── */}
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
