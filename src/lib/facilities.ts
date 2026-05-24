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
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  checkin_time: string | null;
  checkout_time: string | null;
  min_nights: number | null;
};

export type SearchParams = {
  area?: string;
  checkin?: string;
  checkout?: string;
  guests?: number;
  tag?: string;
};

export async function searchFacilities(params: SearchParams): Promise<Facility[]> {
  const { area, guests, tag } = params;

  // Build the select string. Use !inner on areas/facility_tags when filtering
  // by their slugs so that rows without a match are excluded from results.
  const areaSelect = area ? "areas!inner(id, name, slug, prefecture)" : "areas(id, name, slug, prefecture)";
  const tagSelect = tag
    ? "facility_tags!inner(tags!inner(id, name, slug))"
    : "facility_tags(tags(id, name, slug))";

  let query = supabase
    .from("facilities")
    .select(
      `id, name, slug, description, max_guests, is_published,
      ${areaSelect},
      facility_images(id, url, is_hero),
      ${tagSelect},
      pricing_rules(id, price_per_night)`
    )
    .eq("is_published", true);

  if (area) {
    query = query.eq("areas.slug", area);
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
      bedrooms, bathrooms, parking_spaces,
      checkin_time, checkout_time, min_nights,
      areas(id, name, slug, prefecture),
      facility_images(id, url, alt_text, is_hero, sort_order),
      facility_tags(tags(id, name, slug, category)),
      pricing_rules(id, season, day_type, price_per_night),
      seasons(id, name, start_date, end_date)`
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
