"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import FacilityCard from "@/components/FacilityCard";
import { getLowestPrice } from "@/lib/facilities";
import type { Facility } from "@/lib/facilities";

export default function FavoritesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    supabase
      .from("favorites")
      .select(`
        facility_id,
        facilities(
          id, name, slug, max_guests, is_published,
          areas(id, name, slug, prefecture),
          facility_images(id, url, is_hero),
          facility_tags(tags(id, name, slug)),
          pricing_rules(id, price_per_night)
        )
      `)
      .eq("user_id", user.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error }: { data: any[] | null; error: any }) => {
        if (error) {
          console.error("favorites fetch error:", error.message);
        } else {
          const favFacilities = (data ?? [])
            .map((row) => row.facilities)
            .filter(Boolean) as Facility[];
          setFacilities(favFacilities);
        }
        setLoading(false);
      });
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">お気に入り</h1>

      {facilities.length === 0 ? (
        <p className="text-gray-500">お気に入りに登録した施設がありません。</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => {
            const heroImage = facility.facility_images.find((img) => img.is_hero);
            return (
              <li key={facility.id}>
                <FacilityCard
                  facilityId={Number(facility.id)}
                  slug={facility.slug}
                  name={facility.name}
                  areaName={facility.areas?.name ?? null}
                  maxGuests={facility.max_guests}
                  tags={facility.facility_tags.map((ft) => ({ name: ft.tags.name }))}
                  heroImageUrl={heroImage?.url ?? null}
                  lowestPrice={getLowestPrice(facility.pricing_rules)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
