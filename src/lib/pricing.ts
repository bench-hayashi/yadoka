import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayType    = "weekday" | "weekend";
type SeasonType = "low" | "mid" | "high";
type OverrideType = "flat" | "minimum";

type PricingRule = {
  season:        SeasonType;
  day_type:      DayType;
  minimum_price: number;
  adult_fee:     number;
  child_fee:     number;
  infant_fee:    number;
  pet_fee:       number;
};

type Season = {
  start_date: string;
  end_date:   string;
  name:       string;
};

type SimpleSeason = {
  month:  number;
  season: SeasonType;
};

type PricingOverride = {
  target_date:     string;
  override_amount: number;
  override_type:   OverrideType;
};

export type PriceBreakdown = {
  date:          string;
  dayType:       DayType;
  season:        SeasonType;
  isOverride:    boolean;
  overrideType:  OverrideType | null;
  minimumPrice:  number;
  guestCharge:   number;
  petCharge:     number;
  nightTotal:    number;
};

export type PriceResult = {
  totalPrice:     number;
  nights:         number;
  guestBreakdown: { adults: number; children: number; infants: number; pets: number };
  breakdown:      PriceBreakdown[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function eachNight(checkin: string, checkout: string): string[] {
  const nights: string[] = [];
  let current = checkin;
  while (current < checkout) {
    nights.push(current);
    current = addDays(current, 1);
  }
  return nights;
}

// 土曜に泊まる（翌朝日曜にチェックアウト）= weekend
// "YYYY-MM-DD" を UTC midnight としてパースすると getDay() がタイムゾーン依存になるため
// 日付部分を直接分解して Date を構築する
function getDayType(dateStr: string): DayType {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 6 ? "weekend" : "weekday";
}

export function getSeason(
  _facilityId: number,
  dateStr: string,
  detailedSeasons: Season[],
  simpleSeasons: SimpleSeason[],
): SeasonType {
  // 1. detailedSeasons（seasonsテーブル）最優先
  for (const s of detailedSeasons) {
    if (dateStr >= s.start_date && dateStr <= s.end_date) {
      return s.name as SeasonType;
    }
  }

  // 2. simpleSeasons（simple_seasonsテーブル）の月で判定
  const month = parseInt(dateStr.split("-")[1], 10);
  for (const s of simpleSeasons) {
    if (s.month === month) {
      return s.season;
    }
  }

  // 3. デフォルト
  return "low";
}

// ─── getDayMinPrice ───────────────────────────────────────────────────────────

/**
 * ある1日の「ミニマム料金」を返す（カレンダー表示用）。
 * 優先順位：pricing_overrides → 詳細シーズン → 簡易シーズン → デフォルト(low)
 * override は flat/minimum どちらも override_amount を表示価格として返す。
 */
export function getDayMinPrice(
  dateStr: string,
  facilityId: number,
  detailedSeasons: { start_date: string; end_date: string; name: string }[],
  simpleSeasons:   { month: number; season: string }[],
  rules:           { season: string; day_type: string; minimum_price: number }[],
  overrides:       { target_date: string; override_amount: number }[],
): number | null {
  // 1. 特定日上書き
  const override = overrides.find(o => o.target_date === dateStr);
  if (override) return override.override_amount;

  // 2. 曜日判定（pricing.ts の getDayType と同ロジック）
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dow = new Date(y, mo - 1, d).getDay();
  const dayType: DayType = dow === 6 ? "weekend" : "weekday";

  // 3. シーズン判定（getSeason と同ロジック）
  let season = "low";
  for (const s of detailedSeasons) {
    if (dateStr >= s.start_date && dateStr <= s.end_date) {
      season = s.name;
      break;
    }
  }
  if (season === "low") {
    const month = parseInt(dateStr.split("-")[1], 10);
    for (const s of simpleSeasons) {
      if (s.month === month) { season = s.season; break; }
    }
  }

  // 4. ルール検索
  const rule = rules.find(r => r.season === season && r.day_type === dayType);
  return rule?.minimum_price ?? null;
}

// ─── calculateTotalPrice ──────────────────────────────────────────────────────

export async function calculateTotalPrice({
  facilityId,
  checkinDate,
  checkoutDate,
  adults   = 2,
  children = 0,
  infants  = 0,
  pets     = 0,
}: {
  facilityId:    number;
  checkinDate:   string;
  checkoutDate:  string;
  adults?:   number;
  children?: number;
  infants?:  number;
  pets?:     number;
}): Promise<PriceResult | null> {
  const nights = eachNight(checkinDate, checkoutDate);
  if (nights.length === 0) return null;

  const id = Number(facilityId);

  const [
    { data: rulesData,         error: rulesError         },
    { data: seasonsData,       error: seasonsError       },
    { data: simpleSeasonsData, error: simpleSeasonsError },
    { data: overridesData,     error: overridesError     },
  ] = await Promise.all([
    supabase
      .from("pricing_rules")
      .select("season, day_type, minimum_price, adult_fee, child_fee, infant_fee, pet_fee")
      .eq("facility_id", id),
    supabase
      .from("seasons")
      .select("start_date, end_date, name")
      .eq("facility_id", id),
    supabase
      .from("simple_seasons")
      .select("month, season")
      .eq("facility_id", id),
    supabase
      .from("pricing_overrides")
      .select("target_date, override_amount, override_type")
      .eq("facility_id", id)
      .gte("target_date", checkinDate)
      .lte("target_date", addDays(checkoutDate, -1)),
  ]);

  if (rulesError)         console.error("pricing_rules fetch error:",   rulesError);
  if (seasonsError)       console.error("seasons fetch error:",         seasonsError);
  if (simpleSeasonsError) console.error("simple_seasons fetch error:",  simpleSeasonsError);
  if (overridesError)     console.error("pricing_overrides fetch error:", overridesError);

  const rules:         PricingRule[]    = (rulesData         ?? []) as PricingRule[];
  const detailedSeasons: Season[]       = (seasonsData       ?? []) as Season[];
  const simpleSeasons: SimpleSeason[]   = (simpleSeasonsData ?? []) as SimpleSeason[];

  // ルックアップマップ構築
  const ruleMap = new Map<string, PricingRule>();
  for (const r of rules) {
    ruleMap.set(`${r.season}:${r.day_type}`, r);
  }

  const overrideMap = new Map<string, PricingOverride>();
  for (const o of (overridesData ?? []) as PricingOverride[]) {
    overrideMap.set(o.target_date, o);
  }

  const breakdown: PriceBreakdown[] = [];

  for (const date of nights) {
    const dayType = getDayType(date);
    const season  = getSeason(id, date, detailedSeasons, simpleSeasons);
    const rule    = ruleMap.get(`${season}:${dayType}`);

    // pet_fee は常にシーズン×曜日のルールから取得（上書き日も同様）
    const petFee    = rule?.pet_fee ?? 0;
    const petCharge = pets * petFee;

    const override = overrideMap.get(date);

    if (override) {
      const guestCharge =
        adults   * (rule?.adult_fee  ?? 0) +
        children * (rule?.child_fee  ?? 0) +
        infants  * (rule?.infant_fee ?? 0);

      const subtotal =
        override.override_type === "flat"
          ? override.override_amount
          : Math.max(override.override_amount, guestCharge);

      breakdown.push({
        date,
        dayType,
        season,
        isOverride:   true,
        overrideType: override.override_type,
        minimumPrice: rule?.minimum_price ?? 0,
        guestCharge,
        petCharge,
        nightTotal: subtotal + petCharge,
      });
      continue;
    }

    // 通常計算
    if (!rule) {
      console.warn(`[pricing] 料金ルール未定義のため null を返します: key="${season}:${dayType}"`);
      return null;
    }

    const guestCharge =
      adults   * rule.adult_fee +
      children * rule.child_fee +
      infants  * rule.infant_fee;

    const subtotal = Math.max(rule.minimum_price, guestCharge);

    breakdown.push({
      date,
      dayType,
      season,
      isOverride:   false,
      overrideType: null,
      minimumPrice: rule.minimum_price,
      guestCharge,
      petCharge,
      nightTotal: subtotal + petCharge,
    });
  }

  const totalPrice = breakdown.reduce((sum, b) => sum + b.nightTotal, 0);

  return {
    totalPrice,
    nights:         nights.length,
    guestBreakdown: { adults, children, infants, pets },
    breakdown,
  };
}

// ─── checkAvailability ────────────────────────────────────────────────────────

export async function checkAvailability(
  facilityId: number,
  checkinDate: string,
  checkoutDate: string,
): Promise<{ isAvailable: boolean; unavailableDates: string[] }> {
  const nights = eachNight(checkinDate, checkoutDate);
  if (nights.length === 0) return { isAvailable: false, unavailableDates: [] };

  const { data, error } = await supabase
    .from("availability")
    .select("target_date, is_available")
    .eq("facility_id", facilityId)
    .gte("target_date", checkinDate)
    .lte("target_date", addDays(checkoutDate, -1));

  if (error) {
    console.error("checkAvailability fetch error:", error.message);
    return { isAvailable: false, unavailableDates: nights };
  }

  const availMap = new Map<string, boolean>(
    (data ?? []).map((row) => [row.target_date, row.is_available]),
  );

  // レコードなし（undefined）はデフォルト空室。is_available === false の日のみ満室とみなす
  const unavailableDates = nights.filter((d) => availMap.get(d) === false);

  return {
    isAvailable: unavailableDates.length === 0,
    unavailableDates,
  };
}
