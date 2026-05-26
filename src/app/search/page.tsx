import Link from "next/link";
import { searchFacilities, getLowestPrice } from "@/lib/facilities";
import { supabase } from "@/lib/supabase";
import FacilityCard from "@/components/FacilityCard";

type PageSearchParams = Promise<{
  area?: string;
  checkin?: string;
  checkout?: string;
  guests?: string;
  tag?: string;
}>;

type Tag = {
  id: string;
  name: string;
  slug: string;
};

function formatDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function buildConditionLabel(
  area: string | undefined,
  checkin: string | undefined,
  checkout: string | undefined,
  guests: string | undefined,
): string {
  const parts: string[] = [];
  if (area) parts.push(area);
  const ci = formatDate(checkin);
  const co = formatDate(checkout);
  if (ci && co) parts.push(`${ci}〜${co}`);
  else if (ci) parts.push(ci);
  if (guests) parts.push(`${guests}名`);
  return parts.join(" / ") || "条件指定なし";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const { area, checkin, checkout, guests, tag } = await searchParams;

  const [facilities, { data: allTags }] = await Promise.all([
    searchFacilities({
      area,
      checkin,
      checkout,
      guests: guests ? Number(guests) : undefined,
      tag,
    }),
    supabase.from("tags").select("id, name, slug").eq("category", "theme"),
  ]);

  const tagList: Tag[] = allTags ?? [];
  const conditionLabel = buildConditionLabel(area, checkin, checkout, guests);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 検索条件バー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {facilities.length}件の施設が見つかりました
            </span>
            <span className="hidden sm:block text-gray-300">|</span>
            <span className="text-sm text-gray-500">{conditionLabel}</span>
          </div>
          <Link
            href="/"
            className="shrink-0 text-sm text-[#1B4332] hover:text-[#2D6A4F] transition-colors"
          >
            条件を変更
          </Link>
        </div>
      </div>

      {/* メインエリア */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* 左カラム：フィルター（PC幅のみ） */}
          <aside className="hidden lg:block w-[250px] shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20">
              <p className="text-sm font-semibold text-gray-900 mb-4">こだわり条件</p>
              {tagList.length > 0 ? (
                <ul className="space-y-2">
                  {tagList.map((t) => (
                    <li key={t.id}>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          defaultChecked={t.slug === tag}
                          className="h-4 w-4 rounded border-gray-300 text-[#1B4332] focus:ring-[#1B4332]"
                          disabled
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          {t.name}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">タグがありません</p>
              )}
            </div>
          </aside>

          {/* 右カラム：施設グリッド */}
          <div className="flex-1 min-w-0">
            {facilities.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {facilities.map((facility) => (
                  <li key={facility.id}>
                    <FacilityCard
                      facilityId={Number(facility.id)}
                      slug={facility.slug}
                      name={facility.name}
                      areaName={facility.areas?.name ?? null}
                      maxGuests={facility.max_guests}
                      tags={facility.facility_tags.map((ft) => ft.tags)}
                      heroImageUrl={facility.facility_images[0]?.url ?? null}
                      lowestPrice={getLowestPrice(facility.pricing_rules)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-gray-500">
                  条件に合う施設が見つかりませんでした。
                  <br />
                  条件を変更してお試しください。
                </p>
                <Link
                  href="/"
                  className="mt-6 text-sm text-[#1B4332] hover:text-[#2D6A4F] transition-colors"
                >
                  検索条件を変更する
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
