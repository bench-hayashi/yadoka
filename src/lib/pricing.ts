import { supabase } from "@/lib/supabase";

type DayType = "weekday" | "weekend";
type SeasonType = "low" | "mid" | "high";

type PricingRule = {
  season: SeasonType;
  day_type: DayType;
  price_per_night: number;
};

type Season = {
  start_date: string;
  end_date: string;
  name: string;
};

type PricingOverride = {
  target_date: string;
  price_per_night: number;
};

export type PriceBreakdown = {
  date: string;
  dayType: DayType;
  season: SeasonType;
  price: number;
  isOverride: boolean;
};

export type PriceResult = {
  totalPrice: number;
  nights: number;
  breakdown: PriceBreakdown[];
};

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

function getSeasonForDate(dateStr: string, seasons: Season[]): SeasonType | null {
  for (const s of seasons) {
    if (dateStr >= s.start_date && dateStr <= s.end_date) {
      return s.name as SeasonType;
    }
  }
  return null;
}

export async function calculateTotalPrice(
  facilityId: number,
  checkinDate: string,
  checkoutDate: string,
): Promise<PriceResult | null> {
  const nights = eachNight(checkinDate, checkoutDate);
  if (nights.length === 0) return null;

  const id = Number(facilityId);

  const [
    { data: rulesData, error: rulesError },
    { data: seasonsData, error: seasonsError },
    { data: overridesData, error: overridesError },
  ] = await Promise.all([
    supabase
      .from("pricing_rules")
      .select("season, day_type, price_per_night")
      .eq("facility_id", id),
    supabase
      .from("seasons")
      .select("start_date, end_date, name")
      .eq("facility_id", id),
    supabase
      .from("pricing_overrides")
      .select("target_date, price_per_night")
      .eq("facility_id", id)
      .gte("target_date", checkinDate)
      .lte("target_date", addDays(checkoutDate, -1)),
  ]);

  if (rulesError) console.error("pricing_rules fetch error:", rulesError);
  if (seasonsError) console.error("seasons fetch error:", seasonsError);
  if (overridesError) console.error("pricing_overrides fetch error:", overridesError);

  const rules: PricingRule[] = (rulesData ?? []) as PricingRule[];
  const seasons: Season[] = (seasonsData ?? []) as Season[];

  // [DEBUG] 取得データを確認
  console.log(`[pricing] facilityId=${facilityId} (type: ${typeof facilityId}) → Number変換後: id=${id} (type: ${typeof id})`);
  console.log(`[pricing] pricing_rules: ${rules.length}件`, rules);
  console.log(`[pricing] seasons: ${seasons.length}件`, seasons);

  // ルックアップマップ構築
  const ruleMap = new Map<string, number>();
  for (const r of rules) {
    ruleMap.set(`${r.season}:${r.day_type}`, r.price_per_night);
  }
  console.log("[pricing] ruleMap keys:", [...ruleMap.keys()]);

  const overrideMap = new Map<string, number>();
  for (const o of (overridesData ?? []) as PricingOverride[]) {
    overrideMap.set(o.target_date, o.price_per_night);
  }

  const breakdown: PriceBreakdown[] = [];

  for (const date of nights) {
    const isOverride = overrideMap.has(date);

    if (isOverride) {
      const dayType = getDayType(date);
      const season = getSeasonForDate(date, seasons) ?? "low";
      breakdown.push({
        date,
        dayType,
        season,
        price: overrideMap.get(date)!,
        isOverride: true,
      });
      continue;
    }

    const dayType = getDayType(date);
    const season = getSeasonForDate(date, seasons);

    // [DEBUG] 各宿泊日の判定結果を確認
    console.log(`[pricing] ${date}: dayType=${dayType}, season=${season ?? "null"}, lookupKey=${season}:${dayType}`);

    if (!season) {
      console.warn(`[pricing] シーズン未定義のため null を返します: ${date}`);
      return null;
    }

    const price = ruleMap.get(`${season}:${dayType}`);
    if (price === undefined) {
      console.warn(`[pricing] 料金ルール未定義のため null を返します: key="${season}:${dayType}"`);
      return null;
    }

    breakdown.push({ date, dayType, season, price, isOverride: false });
  }

  const totalPrice = breakdown.reduce((sum, b) => sum + b.price, 0);

  return { totalPrice, nights: nights.length, breakdown };
}

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

  const unavailableDates = nights.filter((d) => availMap.get(d) !== true);

  return {
    isAvailable: unavailableDates.length === 0,
    unavailableDates,
  };
}
