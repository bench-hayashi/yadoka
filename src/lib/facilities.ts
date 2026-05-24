import { supabase } from "@/lib/supabase";

export type PricingRule = {
  id: string;
  price_per_night: number;
};

export type FacilityTag = {
  tags: {
    id: string;
    name: string;
    slug: string;
  };
};

export type FacilityImage = {
  id: string;
  url: string;
  is_hero: boolean;
};

export type Area = {
  id: string;
  name: string;
  slug: string;
  prefecture: string;
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

export function getLowestPrice(pricingRules: PricingRule[]): number | null {
  if (pricingRules.length === 0) return null;
  return Math.min(...pricingRules.map((r) => r.price_per_night));
}
