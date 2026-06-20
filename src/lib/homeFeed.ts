import { supabase } from "@/lib/supabase";
import type { Facility } from "@/lib/facilities";

/**
 * TOPページの各セクション用データ取得関数群。
 *
 * 各関数は FacilityCard 表示に必要な最小カラムのみを select し、
 * 公開施設（is_published = true）かつ hero 画像 1 枚に絞って返す。
 * 返却型はすべて `Facility`（searchFacilities と同じ形）に揃える。
 */

const DEFAULT_LIMIT = 12;

/**
 * FacilityCard 表示に必要なカラムだけを取得する共通 select。
 * areas / facility_tags / facility_images / pricing_rules を埋め込む。
 */
const CARD_SELECT = `
  id, name, slug, max_guests, published_at,
  areas(name, slug),
  facility_images(url, is_hero),
  facility_tags(tags(name, slug)),
  pricing_rules(minimum_price)
`;

/** Date を 'YYYY-MM-DD'（ローカル日付）へ整形する。 */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 今日から7日以内（今日含む）に空室がある公開施設。
 * availability を !inner で結合し、is_available=true の日付だけを埋め込む。
 * 埋め込んだ空室日数が多い順 → 同数なら新着順で並べる。
 */
export async function getAvailableThisWeek(
  limit = DEFAULT_LIMIT,
): Promise<Facility[]> {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 6); // 今日を1日目とした7日間
  const start = toDateStr(today);
  const endStr = toDateStr(end);

  const { data, error } = await supabase
    .from("facilities")
    .select(`${CARD_SELECT}, availability!inner(target_date)`)
    .eq("is_published", true)
    .eq("facility_images.is_hero", true)
    .eq("availability.is_available", true)
    .gte("availability.target_date", start)
    .lte("availability.target_date", endStr)
    .limit(limit);

  if (error) {
    console.error("getAvailableThisWeek error:", error.message);
    return [];
  }

  // 埋め込まれた availability は範囲内の空室日のみ → その件数で並べ替える。
  const rows = (data ?? []) as unknown as (Facility & {
    availability?: { target_date: string }[];
    published_at?: string | null;
  })[];

  rows.sort((a, b) => {
    const diff = (b.availability?.length ?? 0) - (a.availability?.length ?? 0);
    if (diff !== 0) return diff;
    return (b.published_at ?? "").localeCompare(a.published_at ?? "");
  });

  return rows as unknown as Facility[];
}

/**
 * 翌月（来月1日〜末日）に空室がある公開施設。
 */
export async function getAvailableNextMonth(
  limit = DEFAULT_LIMIT,
): Promise<Facility[]> {
  const now = new Date();
  const firstOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastOfNext = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const start = toDateStr(firstOfNext);
  const end = toDateStr(lastOfNext);

  const { data, error } = await supabase
    .from("facilities")
    .select(`${CARD_SELECT}, availability!inner(target_date)`)
    .eq("is_published", true)
    .eq("facility_images.is_hero", true)
    .eq("availability.is_available", true)
    .gte("availability.target_date", start)
    .lte("availability.target_date", end)
    .limit(limit);

  if (error) {
    console.error("getAvailableNextMonth error:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as (Facility & {
    availability?: { target_date: string }[];
    published_at?: string | null;
  })[];

  rows.sort((a, b) => {
    const diff = (b.availability?.length ?? 0) - (a.availability?.length ?? 0);
    if (diff !== 0) return diff;
    return (b.published_at ?? "").localeCompare(a.published_at ?? "");
  });

  return rows as unknown as Facility[];
}

/**
 * 指定エリア（areaSlug）の公開施設。新着順。
 */
export async function getFacilitiesByArea(
  areaSlug: string,
  limit = DEFAULT_LIMIT,
): Promise<Facility[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select(`
      id, name, slug, max_guests, published_at,
      areas!inner(name, slug),
      facility_images(url, is_hero),
      facility_tags(tags(name, slug)),
      pricing_rules(minimum_price)
    `)
    .eq("is_published", true)
    .eq("facility_images.is_hero", true)
    .eq("areas.slug", areaSlug)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("getFacilitiesByArea error:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Facility[];
}

/**
 * 指定テーマタグ（tagSlug）がついた公開施設。新着順。
 */
export async function getFacilitiesByTheme(
  tagSlug: string,
  limit = DEFAULT_LIMIT,
): Promise<Facility[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select(`
      id, name, slug, max_guests, published_at,
      areas(name, slug),
      facility_images(url, is_hero),
      facility_tags!inner(tags!inner(name, slug)),
      pricing_rules(minimum_price)
    `)
    .eq("is_published", true)
    .eq("facility_images.is_hero", true)
    .eq("facility_tags.tags.slug", tagSlug)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("getFacilitiesByTheme error:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Facility[];
}

/**
 * 公開施設を published_at の新しい順で取得。
 */
export async function getNewestFacilities(
  limit = DEFAULT_LIMIT,
): Promise<Facility[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select(CARD_SELECT)
    .eq("is_published", true)
    .eq("facility_images.is_hero", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("getNewestFacilities error:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Facility[];
}

export type PopularArea = {
  id: string;
  name: string;
  slug: string;
  prefecture: string | null;
  facilityCount: number;
};

/**
 * 公開施設数が多いエリアを上位 N 件返す（TOPのエリアセクション生成用）。
 * areas に公開施設の count を埋め込み、件数の多い順に並べて返す。
 */
export async function getPopularAreas(limit = 2): Promise<PopularArea[]> {
  const { data, error } = await supabase
    .from("areas")
    .select(`
      id, name, slug, prefecture,
      facilities!inner(count)
    `)
    .eq("facilities.is_published", true);

  if (error) {
    console.error("getPopularAreas error:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    prefecture: string | null;
    facilities: { count: number }[];
  }[];

  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      prefecture: r.prefecture,
      facilityCount: r.facilities?.[0]?.count ?? 0,
    }))
    .filter((a) => a.facilityCount > 0)
    .sort((a, b) => b.facilityCount - a.facilityCount)
    .slice(0, limit);
}
