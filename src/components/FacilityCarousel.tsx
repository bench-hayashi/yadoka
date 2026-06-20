"use client";

import { useRef } from "react";
import Link from "next/link";
import FacilityCard from "@/components/FacilityCard";
import { getLowestPrice, type Facility } from "@/lib/facilities";

type Props = {
  title: string;
  subtitle?: string;
  facilities: Facility[];
  viewAllHref: string;
  badge?: string;
  /** ファーストビューのカルーセル（通常は最上段の1つ）のみ true にして
   *  先頭数枚の画像を優先読み込みする。 */
  priority?: boolean;
};

export default function FacilityCarousel({
  title,
  subtitle,
  facilities,
  viewAllHref,
  badge,
  priority = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 0件セクションは丸ごと非表示にする。
  if (facilities.length === 0) return null;

  const scrollByCards = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    // カード約3枚分をスクロール。
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="space-y-4">
      {/* 見出し行 */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
          {badge && (
            <span className="rounded-full bg-[#1B4332]/10 px-2.5 py-0.5 text-xs font-medium text-[#1B4332]">
              {badge}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-gray-400">{subtitle}</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* PC用 矢印ボタン */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollByCards("left")}
              aria-label="前へ"
              className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-[#2D6A4F] hover:text-[#1B4332] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollByCards("right")}
              aria-label="次へ"
              className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-[#2D6A4F] hover:text-[#1B4332] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <Link
            href={viewAllHref}
            className="whitespace-nowrap text-sm font-medium text-[#1B4332] hover:underline"
          >
            すべて見る ›
          </Link>
        </div>
      </div>

      {/* 横スクロール領域 */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1
          snap-x snap-mandatory scroll-smooth
          [scrollbar-width:thin]
          [&::-webkit-scrollbar]:h-1.5
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-gray-200
          [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {facilities.map((facility, i) => (
          <div
            key={facility.id}
            className="w-[200px] shrink-0 snap-start"
          >
            <FacilityCard
              facilityId={Number(facility.id)}
              slug={facility.slug}
              name={facility.name}
              areaName={facility.areas?.name ?? null}
              maxGuests={facility.max_guests}
              tags={(facility.facility_tags ?? []).map((ft) => ({ name: ft.tags.name }))}
              heroImageUrl={facility.facility_images[0]?.url ?? null}
              lowestPrice={getLowestPrice(facility.pricing_rules)}
              // 先頭カルーセルの最初の4枚だけ優先読み込み（残りは lazy）
              priority={priority && i < 4}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
