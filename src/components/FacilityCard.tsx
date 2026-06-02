import Link from "next/link";
import Image from "next/image";
import FavoriteButton from "@/components/FavoriteButton";
import { getOptimizedUrl } from "@/lib/cloudinary";

type Tag = {
  name: string;
};

type Props = {
  facilityId: number;
  slug: string;
  name: string;
  areaName: string | null;
  maxGuests: number;
  tags: Tag[];
  heroImageUrl: string | null;
  lowestPrice: number | null;
};

export default function FacilityCard({
  facilityId,
  slug,
  name,
  areaName,
  maxGuests,
  tags,
  heroImageUrl,
  lowestPrice,
}: Props) {
  const visibleTags = tags.slice(0, 3);

  return (
    <Link
      href={`/facility/${slug}`}
      className="group block rounded-2xl bg-white border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
      {/* サムネイル */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <div className="absolute top-2 right-2 z-10">
          <FavoriteButton facilityId={facilityId} />
        </div>
        {heroImageUrl ? (
          <Image
            src={getOptimizedUrl(heroImageUrl)}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M3.75 3.75h16.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75V4.5a.75.75 0 01.75-.75z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* テキスト */}
      <div className="p-4 space-y-2">
        <p className="font-bold text-gray-900 truncate">{name}</p>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          {areaName && <span>{areaName}</span>}
          {areaName && <span>·</span>}
          <span>最大{maxGuests}名</span>
        </div>

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTags.map((tag) => (
              <span
                key={tag.name}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <p className="pt-1 text-sm font-semibold text-gray-900">
          {lowestPrice !== null ? (
            <>
              <span className="text-[#1B4332]">
                ¥{lowestPrice.toLocaleString("ja-JP")}〜
              </span>
              <span className="text-xs font-normal text-gray-400"> / 泊</span>
            </>
          ) : (
            <span className="text-xs font-normal text-gray-400">料金はお問い合わせ</span>
          )}
        </p>
      </div>
    </Link>
  );
}
