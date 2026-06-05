import { supabase } from "@/lib/supabase";
import { getSeason } from "@/lib/pricing";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayType    = "weekday" | "weekend";
type SeasonType = "low" | "mid" | "high";
type OverrideType = "flat" | "minimum";

type Season      = { start_date: string; end_date: string; name: string };
type SimpleSeason = { month: number; season: SeasonType };

export type CalendarCell = {
  isAvailable:  boolean;
  source:       string | null;
  price:        number | null;
  basePrice:    number | null;       // シーズンルール由来のminimum_price（上書き解除時に復元）
  isOverride:   boolean;
  overrideType: "flat" | "minimum" | null;
};

export type OwnerCalendarData = {
  facilities: { id: number; name: string }[];
  dates:      string[];
  cells:      Record<number, Record<string, CalendarCell>>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function generateDates(startDate: string, days: number): string[] {
  const [y, mo, d] = startDate.split("-").map(Number);
  return Array.from({ length: days }, (_, i) => fmt(new Date(y, mo - 1, d + i)));
}

// 土曜泊 = weekend、それ以外 = weekday（UTC依存を避けてローカル分解）
function getDayType(dateStr: string): DayType {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d).getDay() === 6 ? "weekend" : "weekday";
}

function groupBy<T>(
  rows: T[],
  key: (row: T) => number,
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const k = key(row);
    const arr = map.get(k);
    if (arr) arr.push(row);
    else map.set(k, [row]);
  }
  return map;
}

// ─── getOwnerCalendarData ─────────────────────────────────────────────────────

export async function getOwnerCalendarData(
  ownerId: string,
  startDate: string,
  days: number,
): Promise<OwnerCalendarData> {
  const dates   = generateDates(startDate, days);
  const endDate = dates[dates.length - 1];

  // 1. オーナーの全施設（公開/非公開問わず）
  const { data: facilitiesData } = await supabase
    .from("facilities")
    .select("id, name")
    .eq("owner_id", ownerId)
    .order("id");

  const facilities = (facilitiesData ?? []) as { id: number; name: string }[];
  if (facilities.length === 0) {
    return { facilities: [], dates, cells: {} };
  }

  const facilityIds = facilities.map(f => f.id);

  // 2. 関連データを一括取得（DB呼び出し5本）
  const [
    { data: availData     },
    { data: rulesData     },
    { data: seasonsData   },
    { data: simpleData    },
    { data: overridesData },
  ] = await Promise.all([
    supabase
      .from("availability")
      .select("facility_id, target_date, is_available, source")
      .in("facility_id", facilityIds)
      .gte("target_date", startDate)
      .lte("target_date", endDate),
    supabase
      .from("pricing_rules")
      .select("facility_id, season, day_type, minimum_price")
      .in("facility_id", facilityIds),
    supabase
      .from("seasons")
      .select("facility_id, start_date, end_date, name")
      .in("facility_id", facilityIds)
      .lte("start_date", endDate)
      .gte("end_date", startDate),
    supabase
      .from("simple_seasons")
      .select("facility_id, month, season")
      .in("facility_id", facilityIds),
    supabase
      .from("pricing_overrides")
      .select("facility_id, target_date, override_amount, override_type")
      .in("facility_id", facilityIds)
      .gte("target_date", startDate)
      .lte("target_date", endDate),
  ]);

  // 3. ルックアップマップ構築（全てメモリ上で処理）

  // availability: facilityId → date → { isAvailable, source }
  const availByFacility = new Map<number, Map<string, { isAvailable: boolean; source: string | null }>>();
  for (const row of (availData ?? []) as { facility_id: number; target_date: string; is_available: boolean; source: string | null }[]) {
    let m = availByFacility.get(row.facility_id);
    if (!m) { m = new Map(); availByFacility.set(row.facility_id, m); }
    m.set(row.target_date, { isAvailable: !!row.is_available, source: row.source ?? null });
  }

  // pricing_rules: facilityId → "season:dayType" → minimum_price
  const rulesByFacility = new Map<number, Map<string, number>>();
  for (const row of (rulesData ?? []) as { facility_id: number; season: string; day_type: string; minimum_price: number }[]) {
    let m = rulesByFacility.get(row.facility_id);
    if (!m) { m = new Map(); rulesByFacility.set(row.facility_id, m); }
    m.set(`${row.season}:${row.day_type}`, row.minimum_price);
  }

  // seasons / simple_seasons: facilityId → []
  const seasonsByFacility     = groupBy(
    (seasonsData ?? []) as (Season & { facility_id: number })[],
    r => r.facility_id,
  );
  const simpleSeasonsByFacility = groupBy(
    (simpleData ?? []) as (SimpleSeason & { facility_id: number })[],
    r => r.facility_id,
  );

  // overrides: facilityId → date → { amount, type }
  const overridesByFacility = new Map<number, Map<string, { amount: number; type: OverrideType }>>();
  for (const row of (overridesData ?? []) as { facility_id: number; target_date: string; override_amount: number; override_type: OverrideType }[]) {
    let m = overridesByFacility.get(row.facility_id);
    if (!m) { m = new Map(); overridesByFacility.set(row.facility_id, m); }
    m.set(row.target_date, { amount: row.override_amount, type: row.override_type });
  }

  // 4. 施設×日付のセル計算
  const cells: Record<number, Record<string, CalendarCell>> = {};

  for (const facility of facilities) {
    const fid          = facility.id;
    const availMap     = availByFacility.get(fid);
    const ruleMap      = rulesByFacility.get(fid);
    const detailedSeasons = (seasonsByFacility.get(fid) ?? []) as Season[];
    const simpleSeasons   = (simpleSeasonsByFacility.get(fid) ?? []) as SimpleSeason[];
    const overrideMap  = overridesByFacility.get(fid);

    const facilityCell: Record<string, CalendarCell> = {};

    for (const date of dates) {
      // 空室状態（レコードなしはデフォルト空室）
      const availEntry = availMap?.get(date);
      const isAvailable = availEntry ? availEntry.isAvailable : true;
      const source      = availEntry?.source ?? null;

      // 料金計算
      const override = overrideMap?.get(date);
      const dayType  = getDayType(date);
      const season   = getSeason(fid, date, detailedSeasons, simpleSeasons);
      const minPrice = ruleMap?.get(`${season}:${dayType}`) ?? null;

      let price: number | null;
      let isOverride: boolean;

      if (override) {
        isOverride = true;
        // flat上書き → その金額を表示。minimum上書き → ベースのminimum_priceを表示
        price = override.type === "flat" ? override.amount : minPrice;
      } else {
        isOverride = false;
        price = minPrice;
      }

      facilityCell[date] = {
        isAvailable,
        source,
        price,
        basePrice:    minPrice,
        isOverride,
        overrideType: override?.type ?? null,
      };
    }

    cells[fid] = facilityCell;
  }

  return { facilities, dates, cells };
}
