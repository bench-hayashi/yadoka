"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type SeasonKey = "low" | "mid" | "high";
type DayTypeKey = "weekday" | "weekend";

const SEASONS: { value: SeasonKey; label: string }[] = [
  { value: "low",  label: "ローシーズン"   },
  { value: "mid",  label: "ミドルシーズン" },
  { value: "high", label: "ハイシーズン"   },
];

const DAY_TYPES: { value: DayTypeKey; label: string }[] = [
  { value: "weekday", label: "平日（円）" },
  { value: "weekend", label: "休日（円）" },
];

type RuleCell   = { id: string | null; raw: string };
type RulesGrid  = Record<string, RuleCell>; // key: `${season}_${dayType}`

type SeasonRow = {
  uid:        string;
  id:         string | null;
  name:       SeasonKey;
  start_date: string;
  end_date:   string;
};

type OverrideRow = {
  uid:            string;
  id:             string | null;
  target_date:    string;
  price_per_night: string; // raw digits
  reason:         string;
};

type Props = { facilityId: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _uid = 0;
function uid() { return String(++_uid); }

function fmtNum(raw: string): string {
  const n = parseInt(raw, 10);
  return isNaN(n) ? "" : n.toLocaleString("ja-JP");
}

function toRaw(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

function parseNum(raw: string): number | null {
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

function initGrid(): RulesGrid {
  const g: RulesGrid = {};
  for (const s of SEASONS) for (const d of DAY_TYPES) {
    g[`${s.value}_${d.value}`] = { id: null, raw: "" };
  }
  return g;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingManager({ facilityId }: Props) {
  const [grid,     setGrid]     = useState<RulesGrid>(initGrid);
  const [seasons,  setSeasons]  = useState<SeasonRow[]>([]);
  const [overrides,setOverrides]= useState<OverrideRow[]>([]);

  const [savingGrid,      setSavingGrid]      = useState(false);
  const [savingSeasons,   setSavingSeasons]   = useState(false);
  const [savingOverrides, setSavingOverrides] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  function showToast() {
    setToast("料金設定を保存しました");
    setTimeout(() => setToast(null), 3000);
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchGrid();
    fetchSeasons();
    fetchOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  async function fetchGrid() {
    const { data } = await supabase
      .from("pricing_rules")
      .select("id, season, day_type, price_per_night")
      .eq("facility_id", facilityId);
    if (!data) return;
    setGrid(prev => {
      const next = { ...prev };
      for (const row of data) {
        const key = `${row.season}_${row.day_type}`;
        if (key in next) {
          next[key] = { id: row.id, raw: String(row.price_per_night ?? "") };
        }
      }
      return next;
    });
  }

  async function fetchSeasons() {
    const { data } = await supabase
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("facility_id", facilityId)
      .order("start_date");
    setSeasons(
      (data ?? []).map(r => ({
        uid:        uid(),
        id:         r.id,
        name:       r.name as SeasonKey,
        start_date: r.start_date ?? "",
        end_date:   r.end_date   ?? "",
      }))
    );
  }

  async function fetchOverrides() {
    const { data } = await supabase
      .from("pricing_overrides")
      .select("id, target_date, price_per_night, reason")
      .eq("facility_id", facilityId)
      .order("target_date");
    setOverrides(
      (data ?? []).map(r => ({
        uid:             uid(),
        id:              r.id,
        target_date:     r.target_date    ?? "",
        price_per_night: String(r.price_per_night ?? ""),
        reason:          r.reason         ?? "",
      }))
    );
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function saveGrid() {
    setSavingGrid(true);
    try {
      await Promise.all(
        Object.entries(grid).map(async ([key, cell]) => {
          const price = parseNum(cell.raw);
          if (price === null) return;
          const [season, day_type] = key.split("_");
          if (cell.id) {
            await supabase
              .from("pricing_rules")
              .update({ price_per_night: price })
              .eq("id", cell.id);
          } else {
            await supabase
              .from("pricing_rules")
              .insert({ facility_id: facilityId, season, day_type, price_per_night: price });
          }
        })
      );
      await fetchGrid();
      showToast();
    } finally {
      setSavingGrid(false);
    }
  }

  async function saveSeasons() {
    setSavingSeasons(true);
    try {
      await supabase.from("seasons").delete().eq("facility_id", facilityId);
      const rows = seasons
        .filter(s => s.name && s.start_date && s.end_date)
        .map(s => ({
          facility_id: facilityId,
          name:        s.name,
          start_date:  s.start_date,
          end_date:    s.end_date,
        }));
      if (rows.length > 0) await supabase.from("seasons").insert(rows);
      await fetchSeasons();
      showToast();
    } finally {
      setSavingSeasons(false);
    }
  }

  async function saveOverrides() {
    setSavingOverrides(true);
    try {
      await supabase.from("pricing_overrides").delete().eq("facility_id", facilityId);
      const rows = overrides
        .filter(o => o.target_date && parseNum(o.price_per_night) !== null)
        .map(o => ({
          facility_id:     facilityId,
          target_date:     o.target_date,
          price_per_night: parseNum(o.price_per_night)!,
          reason:          o.reason || null,
        }));
      if (rows.length > 0) await supabase.from("pricing_overrides").insert(rows);
      await fetchOverrides();
      showToast();
    } finally {
      setSavingOverrides(false);
    }
  }

  // ── Grid handlers ──────────────────────────────────────────────────────────

  function setGridCell(key: string, input: string) {
    setGrid(prev => ({ ...prev, [key]: { ...prev[key], raw: toRaw(input) } }));
  }

  // ── Season handlers ────────────────────────────────────────────────────────

  function addSeason() {
    setSeasons(prev => [
      ...prev,
      { uid: uid(), id: null, name: "low", start_date: "", end_date: "" },
    ]);
  }

  function setSeason<K extends keyof Omit<SeasonRow, "uid" | "id">>(
    rowUid: string, field: K, value: SeasonRow[K]
  ) {
    setSeasons(prev => prev.map(s => s.uid === rowUid ? { ...s, [field]: value } : s));
  }

  function removeSeason(rowUid: string) {
    setSeasons(prev => prev.filter(s => s.uid !== rowUid));
  }

  // ── Override handlers ──────────────────────────────────────────────────────

  function addOverride() {
    setOverrides(prev => [
      ...prev,
      { uid: uid(), id: null, target_date: "", price_per_night: "", reason: "" },
    ]);
  }

  function setOverride<K extends keyof Omit<OverrideRow, "uid" | "id">>(
    rowUid: string, field: K, value: string
  ) {
    setOverrides(prev =>
      prev.map(o =>
        o.uid === rowUid
          ? { ...o, [field]: field === "price_per_night" ? toRaw(value) : value }
          : o
      )
    );
  }

  function removeOverride(rowUid: string) {
    setOverrides(prev => prev.filter(o => o.uid !== rowUid));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* ── Section 1: Pricing Rules ──────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">シーズン×曜日の料金ルール</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="border-b border-gray-200 py-2.5 text-left text-xs font-medium text-gray-500 w-40" />
                {DAY_TYPES.map(d => (
                  <th
                    key={d.value}
                    className="border-b border-gray-200 py-2.5 px-4 text-right text-xs font-medium text-gray-700"
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEASONS.map(s => (
                <tr key={s.value} className="group">
                  <td className="border-b border-gray-100 py-3 text-sm font-medium text-gray-700">
                    {s.label}
                  </td>
                  {DAY_TYPES.map(d => {
                    const key = `${s.value}_${d.value}`;
                    return (
                      <td key={d.value} className="border-b border-gray-100 py-2 px-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={fmtNum(grid[key].raw)}
                          onChange={e => setGridCell(key, e.target.value)}
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right text-sm tabular-nums focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveGrid}
            disabled={savingGrid}
            className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D6A4F] transition-colors disabled:opacity-50"
          >
            {savingGrid ? "保存中..." : "保存"}
          </button>
        </div>
      </section>

      {/* ── Section 2: Season Periods ─────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">シーズン期間の定義</h2>

        <div className="space-y-2">
          {seasons.length === 0 && (
            <p className="text-sm text-gray-400">シーズン期間がまだ設定されていません。</p>
          )}
          {seasons.map(s => (
            <div key={s.uid} className="flex flex-wrap items-center gap-2">
              <select
                value={s.name}
                onChange={e => setSeason(s.uid, "name", e.target.value as SeasonKey)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              >
                {SEASONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <input
                type="date"
                value={s.start_date}
                onChange={e => setSeason(s.uid, "start_date", e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
              <span className="text-sm text-gray-400">〜</span>
              <input
                type="date"
                value={s.end_date}
                onChange={e => setSeason(s.uid, "end_date", e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              />

              <button
                type="button"
                onClick={() => removeSeason(s.uid)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                削除
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={addSeason}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-[#2D6A4F] hover:text-[#1B4332] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            期間を追加
          </button>
          <button
            type="button"
            onClick={saveSeasons}
            disabled={savingSeasons}
            className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D6A4F] transition-colors disabled:opacity-50"
          >
            {savingSeasons ? "保存中..." : "保存"}
          </button>
        </div>
      </section>

      {/* ── Section 3: Pricing Overrides ──────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">特定日の料金上書き</h2>

        <div className="space-y-2">
          {overrides.length === 0 && (
            <p className="text-sm text-gray-400">特定日の料金上書きがまだ設定されていません。</p>
          )}
          {overrides.map(o => (
            <div key={o.uid} className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={o.target_date}
                onChange={e => setOverride(o.uid, "target_date", e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
              <input
                type="text"
                inputMode="numeric"
                value={fmtNum(o.price_per_night)}
                onChange={e => setOverride(o.uid, "price_per_night", e.target.value)}
                placeholder="料金（円）"
                className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm tabular-nums focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
              <input
                type="text"
                value={o.reason}
                onChange={e => setOverride(o.uid, "reason", e.target.value)}
                placeholder="理由（例：GW特別料金）"
                className="flex-1 min-w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
              <button
                type="button"
                onClick={() => removeOverride(o.uid)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                削除
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={addOverride}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-[#2D6A4F] hover:text-[#1B4332] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            追加
          </button>
          <button
            type="button"
            onClick={saveOverrides}
            disabled={savingOverrides}
            className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D6A4F] transition-colors disabled:opacity-50"
          >
            {savingOverrides ? "保存中..." : "保存"}
          </button>
        </div>
      </section>

    </div>
  );
}
