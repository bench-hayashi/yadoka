"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type SeasonKey    = "low" | "mid" | "high";
type DayTypeKey   = "weekday" | "weekend";
type SeasonTab    = "simple" | "detailed";
type OverrideType = "flat" | "minimum";
type FeeKey       = "minimum_price" | "adult_fee" | "child_fee" | "infant_fee" | "pet_fee";

const SEASONS: { value: SeasonKey; label: string; short: string }[] = [
  { value: "low",  label: "ローシーズン",   short: "ロー"   },
  { value: "mid",  label: "ミドルシーズン", short: "ミドル" },
  { value: "high", label: "ハイシーズン",   short: "ハイ"   },
];

const DAY_TYPES: { value: DayTypeKey; label: string }[] = [
  { value: "weekday", label: "平日" },
  { value: "weekend", label: "休日" },
];

const FEES: { key: FeeKey; label: string; hint: string }[] = [
  { key: "minimum_price", label: "ミニマム", hint: "最低料金"  },
  { key: "adult_fee",     label: "大人",     hint: "1名/泊"   },
  { key: "child_fee",     label: "子供",     hint: "1名/泊"   },
  { key: "infant_fee",    label: "幼児",     hint: "0=無料"   },
  { key: "pet_fee",       label: "ペット",   hint: "1頭/泊"   },
];

// 6行: ロー平日, ロー休日, ミドル平日, ミドル休日, ハイ平日, ハイ休日
const RULE_ROWS = SEASONS.flatMap(s =>
  DAY_TYPES.map(d => ({
    key:     `${s.value}_${d.value}`,
    label:   `${s.short} × ${d.label}`,
    season:  s.value as SeasonKey,
    dayType: d.value as DayTypeKey,
  }))
);

const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

const SHIKI_PRESET: SeasonKey[] = [
  "low", "low", "mid", "mid", "mid", "high",
  "high", "high", "mid", "mid", "mid", "low",
];

type RuleRow = {
  id:            string | null;
  minimum_price: string;
  adult_fee:     string;
  child_fee:     string;
  infant_fee:    string;
  pet_fee:       string;
};

type RulesTable = Record<string, RuleRow>; // key: `${season}_${dayType}`

type SeasonRow = {
  uid:        string;
  id:         string | null;
  name:       SeasonKey;
  start_date: string;
  end_date:   string;
};

type SimpleSeasonRow = {
  month:  number; // 1-12
  season: SeasonKey;
};

type OverrideRow = {
  uid:             string;
  id:              string | null;
  target_date:     string;
  override_amount: string;
  override_type:   OverrideType;
  reason:          string;
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

function initRulesTable(): RulesTable {
  const t: RulesTable = {};
  for (const row of RULE_ROWS) {
    t[row.key] = { id: null, minimum_price: "", adult_fee: "", child_fee: "", infant_fee: "", pet_fee: "" };
  }
  return t;
}

function initSimpleSeasons(): SimpleSeasonRow[] {
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, season: "low" as SeasonKey }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingManager({ facilityId }: Props) {
  const [rulesTable,    setRulesTable]    = useState<RulesTable>(initRulesTable);
  const [seasons,       setSeasons]       = useState<SeasonRow[]>([]);
  const [simpleSeasons, setSimpleSeasons] = useState<SimpleSeasonRow[]>(initSimpleSeasons);
  const [overrides,     setOverrides]     = useState<OverrideRow[]>([]);
  const [seasonTab,     setSeasonTab]     = useState<SeasonTab>("simple");

  const [savingRules,         setSavingRules]         = useState(false);
  const [savingSeasons,       setSavingSeasons]       = useState(false);
  const [savingSimpleSeasons, setSavingSimpleSeasons] = useState(false);
  const [savingOverrides,     setSavingOverrides]     = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg = "料金設定を保存しました") {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchRules();
    fetchSeasons();
    fetchSimpleSeasons();
    fetchOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  async function fetchRules() {
    const { data } = await supabase
      .from("pricing_rules")
      .select("id, season, day_type, minimum_price, adult_fee, child_fee, infant_fee, pet_fee")
      .eq("facility_id", facilityId);
    if (!data) return;
    setRulesTable(prev => {
      const next = { ...prev };
      for (const row of data) {
        const key = `${row.season}_${row.day_type}`;
        if (key in next) {
          next[key] = {
            id:            row.id,
            minimum_price: String(row.minimum_price ?? ""),
            adult_fee:     String(row.adult_fee     ?? ""),
            child_fee:     String(row.child_fee     ?? ""),
            infant_fee:    String(row.infant_fee    ?? ""),
            pet_fee:       String(row.pet_fee       ?? ""),
          };
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

  async function fetchSimpleSeasons() {
    const { data } = await supabase
      .from("simple_seasons")
      .select("month, season")
      .eq("facility_id", facilityId);
    if (!data || data.length === 0) return;
    setSimpleSeasons(prev =>
      prev.map(row => {
        const found = data.find(r => r.month === row.month);
        return found ? { ...row, season: found.season as SeasonKey } : row;
      })
    );
  }

  async function fetchOverrides() {
    const { data } = await supabase
      .from("pricing_overrides")
      .select("id, target_date, override_amount, override_type, reason")
      .eq("facility_id", facilityId)
      .order("target_date");
    setOverrides(
      (data ?? []).map(r => ({
        uid:             uid(),
        id:              r.id,
        target_date:     r.target_date     ?? "",
        override_amount: String(r.override_amount ?? ""),
        override_type:   (r.override_type ?? "flat") as OverrideType,
        reason:          r.reason          ?? "",
      }))
    );
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function saveRules() {
    setSavingRules(true);
    try {
      const rows = Object.entries(rulesTable)
        .filter(([, row]) => parseNum(row.minimum_price) !== null)
        .map(([key, row]) => {
          const [season, day_type] = key.split("_");
          return {
            facility_id:   facilityId,
            season,
            day_type,
            minimum_price: parseNum(row.minimum_price)!,
            adult_fee:     parseNum(row.adult_fee)     ?? 0,
            child_fee:     parseNum(row.child_fee)     ?? 0,
            infant_fee:    parseNum(row.infant_fee)    ?? 0,
            pet_fee:       parseNum(row.pet_fee)       ?? 0,
          };
        });
      if (rows.length > 0) {
        await supabase
          .from("pricing_rules")
          .upsert(rows, { onConflict: "facility_id,season,day_type" });
      }
      await fetchRules();
      showToast();
    } finally {
      setSavingRules(false);
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

  async function saveSimpleSeasons() {
    setSavingSimpleSeasons(true);
    try {
      await supabase.from("simple_seasons").delete().eq("facility_id", facilityId);
      const rows = simpleSeasons.map(s => ({
        facility_id: facilityId,
        month:       s.month,
        season:      s.season,
      }));
      await supabase.from("simple_seasons").insert(rows);
      showToast();
    } finally {
      setSavingSimpleSeasons(false);
    }
  }

  async function saveOverrides() {
    setSavingOverrides(true);
    try {
      await supabase.from("pricing_overrides").delete().eq("facility_id", facilityId);
      const rows = overrides
        .filter(o => o.target_date && parseNum(o.override_amount) !== null)
        .map(o => ({
          facility_id:     facilityId,
          target_date:     o.target_date,
          override_amount: parseNum(o.override_amount)!,
          override_type:   o.override_type,
          reason:          o.reason || null,
        }));
      if (rows.length > 0) await supabase.from("pricing_overrides").insert(rows);
      await fetchOverrides();
      showToast();
    } finally {
      setSavingOverrides(false);
    }
  }

  // ── Rules handlers ─────────────────────────────────────────────────────────

  function setRuleCell(rowKey: string, feeKey: FeeKey, input: string) {
    setRulesTable(prev => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [feeKey]: toRaw(input) },
    }));
  }

  // ── Simple season handlers ─────────────────────────────────────────────────

  function setSimpleSeason(month: number, season: SeasonKey) {
    setSimpleSeasons(prev =>
      prev.map(r => r.month === month ? { ...r, season } : r)
    );
  }

  function applyShikiPreset() {
    setSimpleSeasons(
      Array.from({ length: 12 }, (_, i) => ({ month: i + 1, season: SHIKI_PRESET[i] }))
    );
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
      { uid: uid(), id: null, target_date: "", override_amount: "", override_type: "flat", reason: "" },
    ]);
  }

  function setOverride<K extends keyof Omit<OverrideRow, "uid" | "id">>(
    rowUid: string, field: K, value: string
  ) {
    setOverrides(prev =>
      prev.map(o =>
        o.uid === rowUid
          ? { ...o, [field]: field === "override_amount" ? toRaw(value) : value }
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
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[580px]">
            <thead>
              <tr>
                {/* 行ラベル列 */}
                <th className="border-b border-gray-200 pb-2.5 text-left text-xs font-medium text-gray-500 w-32" />
                {FEES.map(f => (
                  <th key={f.key} className="border-b border-gray-200 pb-2.5 px-2 text-center w-24">
                    <span className="block text-xs font-semibold text-gray-700">{f.label}</span>
                    <span className="block text-[10px] font-normal text-gray-400">{f.hint}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RULE_ROWS.map((row, i) => {
                const ruleRow = rulesTable[row.key];
                const isLastInSeason = (i + 1) % 2 === 0;
                return (
                  <tr key={row.key}>
                    <td className={`py-2 pr-3 text-sm font-medium text-gray-700 whitespace-nowrap ${isLastInSeason ? "border-b border-gray-200 pb-3" : ""}`}>
                      {row.label}
                    </td>
                    {FEES.map(f => (
                      <td key={f.key} className={`py-2 px-2 ${isLastInSeason ? "border-b border-gray-200 pb-3" : ""}`}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={fmtNum(ruleRow[f.key])}
                          onChange={e => setRuleCell(row.key, f.key, e.target.value)}
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 px-2 py-2 text-right text-sm tabular-nums focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          ミニマムは1泊の最低料金です。人数料金の合計がミニマムを下回る場合はミニマムが適用されます。幼児を無料にする場合は0を入力してください。
        </p>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveRules}
            disabled={savingRules}
            className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D6A4F] transition-colors disabled:opacity-50"
          >
            {savingRules ? "保存中..." : "保存"}
          </button>
        </div>
      </section>

      {/* ── Section 2: Season Definition (tabbed) ────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">シーズン設定</h2>

        {/* Tab header */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
          <button
            type="button"
            onClick={() => setSeasonTab("simple")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              seasonTab === "simple"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            簡易設定
          </button>
          <button
            type="button"
            onClick={() => setSeasonTab("detailed")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              seasonTab === "detailed"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            詳細設定
          </button>
        </div>

        {/* ── Simple tab ─────────────────────────────────────────────────── */}
        {seasonTab === "simple" && (
          <div className="space-y-4">
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              詳細設定で指定した期間がある場合は、その日は詳細設定が優先されます。
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">プリセット：</span>
              <button
                type="button"
                onClick={applyShikiPreset}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-[#2D6A4F] hover:text-[#1B4332] transition-colors"
              >
                四季で設定
              </button>
              <span className="text-xs text-gray-400">
                （冬=ロー・春秋=ミドル・夏=ハイ）
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {simpleSeasons.map(row => (
                <div key={row.month} className="flex items-center gap-3">
                  <span className="w-8 text-sm text-gray-700 tabular-nums shrink-0">
                    {MONTH_LABELS[row.month - 1]}
                  </span>
                  <select
                    value={row.season}
                    onChange={e => setSimpleSeason(row.month, e.target.value as SeasonKey)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                  >
                    {SEASONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              月単位で毎年繰り返し適用されます。特定の期間だけ変えたい場合は詳細設定を使用してください。
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveSimpleSeasons}
                disabled={savingSimpleSeasons}
                className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D6A4F] transition-colors disabled:opacity-50"
              >
                {savingSimpleSeasons ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        )}

        {/* ── Detailed tab ───────────────────────────────────────────────── */}
        {seasonTab === "detailed" && (
          <div className="space-y-4">
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              カレンダーで指定した期間が、簡易設定より優先されます。詳細設定された日は詳細が優先されます。
            </p>

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
          </div>
        )}
      </section>

      {/* ── Section 3: Pricing Overrides ──────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">特定日の料金上書き</h2>
          <p className="mt-1 text-xs text-gray-400">
            日付を指定して1泊料金を上書きできます。
            <span className="mx-1">·</span>
            <strong className="font-medium text-gray-500">定額</strong>：人数に関係なく固定金額を適用
            <span className="mx-1">·</span>
            <strong className="font-medium text-gray-500">ミニマム上書き</strong>：ミニマムだけ変更し、人数料金は通常通り計算
          </p>
        </div>

        <div className="space-y-3">
          {overrides.length === 0 && (
            <p className="text-sm text-gray-400">特定日の料金上書きがまだ設定されていません。</p>
          )}
          {overrides.map(o => (
            <div key={o.uid} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* 日付 */}
                <input
                  type="date"
                  value={o.target_date}
                  onChange={e => setOverride(o.uid, "target_date", e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                />

                {/* 上書きタイプ */}
                <select
                  value={o.override_type}
                  onChange={e => setOverride(o.uid, "override_type", e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                >
                  <option value="flat">定額</option>
                  <option value="minimum">ミニマム上書き</option>
                </select>

                {/* 金額 */}
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fmtNum(o.override_amount)}
                    onChange={e => setOverride(o.uid, "override_amount", e.target.value)}
                    placeholder="金額を入力"
                    className="w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-right text-sm tabular-nums focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">円</span>
                </div>

                {/* 理由 */}
                <input
                  type="text"
                  value={o.reason}
                  onChange={e => setOverride(o.uid, "reason", e.target.value)}
                  placeholder="理由（例：GW特別料金）"
                  className="flex-1 min-w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                />

                <button
                  type="button"
                  onClick={() => removeOverride(o.uid)}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  削除
                </button>
              </div>

              {/* 上書きタイプの説明 */}
              <p className="text-xs text-gray-400 pl-0.5">
                {o.override_type === "flat"
                  ? "この日は大人・子供の人数に関係なく、入力した金額が1泊料金になります（ペット料金は別途加算）。"
                  : "この日のミニマムを入力した金額に変更します。人数料金（大人×単価など）との大きい方が適用されます。"}
              </p>
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
            日付を追加
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
