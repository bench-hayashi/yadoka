import { supabase } from "@/lib/supabase";

export type PricingRule = {
  id: string;
  price_per_night: number;
};

export type PricingRuleDetail = PricingRule & {
  season: string;
  day_type: string;
};

export type FacilityTag = {
  tags: {
    id: string;
    name: string;
    slug: string;
    category: string;
    icon_name: string | null;
  };
};

export type FacilityImage = {
  id: string;
  url: string;
  alt_text: string | null;
  is_hero: boolean;
};

export type Area = {
  id: string;
  name: string;
  slug: string;
  prefecture: string;
};

export type Season = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

export type SimpleSeason = {
  id: string;
  month: number;
  season: string;
};

export type Availability = {
  id: string;
  facility_id: number;
  target_date: string;
  is_available: boolean;
  source: string | null;
  created_at: string;
};

export type Facility = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  max_guests: number;
  is_published: boolean;
  areas: Area | null;
  facility_images: FacilityImage[];
  facility_tags: FacilityTag[];
  pricing_rules: PricingRule[];
};

export type FacilityDetail = Omit<Facility, "pricing_rules"> & {
  pricing_rules: PricingRuleDetail[];
  seasons: Season[];
  simple_seasons: SimpleSeason[];
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  checkin_time: string | null;
  checkout_time: string | null;
  min_nights: number | null;
  license_type: string | null;
  license_number: string | null;
};

export type SearchParams = {
  area?: string | string[];
  checkin?: string;
  checkout?: string;
  guests?: number;
  tag?: string;
};

export async function searchFacilities(params: SearchParams): Promise<Facility[]> {
  const { area, guests, tag } = params;

  const areas = area ? (Array.isArray(area) ? area : [area]) : [];
  const hasArea = areas.length > 0;

  // Build the select string. Use !inner on areas/facility_tags when filtering
  // by their slugs so that rows without a match are excluded from results.
  const areaSelect = hasArea ? "areas!inner(name, slug)" : "areas(name, slug)";
  const tagSelect = tag
    ? "facility_tags!inner(tags!inner(name, slug))"
    : "facility_tags(tags(name, slug))";

  // Only fetch columns needed for the card list. Add .range(offset, offset+19)
  // here when pagination is implemented.
  let query = supabase
    .from("facilities")
    .select(
      `id, name, slug, max_guests,
      ${areaSelect},
      facility_images(url, is_hero),
      ${tagSelect},
      pricing_rules(price_per_night)`
    )
    .eq("is_published", true)
    .limit(20);

  if (hasArea) {
    query = query.in("areas.slug", areas);
  }

  if (guests) {
    query = query.gte("max_guests", guests);
  }

  if (tag) {
    query = query.eq("facility_tags.tags.slug", tag);
  }

  // Limit hero images to 1 per facility
  query = query.eq("facility_images.is_hero", true);

  const { data, error } = await query;

  if (error) {
    console.error("searchFacilities error:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Facility[];
}

export async function getFacilityBySlug(slug: string): Promise<FacilityDetail | null> {
  const { data, error } = await supabase
    .from("facilities")
    .select(
      `id, name, slug, description, max_guests, is_published,
      address, latitude, longitude,
      bedrooms, bathrooms, parking_spaces,
      checkin_time, checkout_time, min_nights,
      license_type, license_number,
      areas(id, name, slug, prefecture),
      facility_images(id, url, alt_text, is_hero, sort_order),
      facility_tags(tags(id, name, slug, category, icon_name)),
      pricing_rules(id, season, day_type, price_per_night),
      seasons(id, name, start_date, end_date),
      simple_seasons(id, month, season)`
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .order("sort_order", { referencedTable: "facility_images" })
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("getFacilityBySlug error:", error.message);
    }
    return null;
  }

  return data as unknown as FacilityDetail;
}

export async function getAvailability(
  facilityId: number,
  startDate: string,
  endDate: string,
): Promise<Availability[]> {
  const { data, error } = await supabase
    .from("availability")
    .select("id, facility_id, target_date, is_available, source, created_at")
    .eq("facility_id", facilityId)
    .gte("target_date", startDate)
    .lte("target_date", endDate)
    .order("target_date");

  if (error) {
    console.error("getAvailability error:", error.message);
    return [];
  }

  return data ?? [];
}

export function getLowestPrice(pricingRules: PricingRule[]): number | null {
  if (pricingRules.length === 0) return null;
  return Math.min(...pricingRules.map((r) => r.price_per_night));
}
