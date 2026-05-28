import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const SITE_URL = "https://yadoka.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: areas }, { data: tags }, { data: facilities }] = await Promise.all([
    supabase.from("areas").select("slug, updated_at"),
    supabase.from("tags").select("slug").eq("category", "theme"),
    supabase.from("facilities").select("slug, updated_at").eq("is_published", true),
  ]);

  const areaEntries: MetadataRoute.Sitemap = (areas ?? []).map((a) => ({
    url: `${SITE_URL}/area/${a.slug}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const themeEntries: MetadataRoute.Sitemap = (tags ?? []).map((t) => ({
    url: `${SITE_URL}/theme/${t.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const facilityEntries: MetadataRoute.Sitemap = (facilities ?? []).map((f) => ({
    url: `${SITE_URL}/facility/${f.slug}`,
    lastModified: f.updated_at ? new Date(f.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...areaEntries,
    ...themeEntries,
    ...facilityEntries,
  ];
}
