import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import SearchForm from "@/components/SearchForm";
import JsonLd from "@/components/JsonLd";
import { getImageUrl } from "@/lib/cloudinary";
import TagIcon from "@/components/TagIcon";

const SITE_URL = "https://yadoka.vercel.app";

type Area = {
  id: string;
  name: string;
  prefecture: string;
  slug: string;
  sort_order: number;
  image_url: string | null;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
  category: string;
  image_url: string | null;
  icon_name: string | null;
};

export default async function Home() {
  const [{ data: areas }, { data: tags }] = await Promise.all([
    supabase.from("areas").select("id, name, prefecture, slug, sort_order, image_url").order("sort_order"),
    supabase.from("tags").select("id, name, slug, category, image_url, icon_name").eq("category", "theme"),
  ]);

  const areaList: Area[] = areas ?? [];
  const tagList: Tag[] = tags ?? [];

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "YADOKA",
        "description": "貸別荘・一棟貸し専門の検索ポータル",
        "url": SITE_URL,
      }} />

      {/* Hero */}
      <section
        className="relative overflow-hidden flex items-center min-h-[400px] sm:h-[480px]"
        style={{ background: "linear-gradient(135deg, #0d2818 0%, #1B4332 40%, #2D6A4F 100%)" }}
      >
        {/* 背景画像（右側透かし） */}
        <div className="absolute top-0 right-0 h-full w-full sm:w-[60%]">
          <Image
            src="https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8"
            alt=""
            fill
            className="object-cover opacity-30 pointer-events-none"
            priority
            sizes="(max-width: 640px) 100vw, 60vw"
          />
        </div>

        {/* メインコンテンツ */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-0">
          <div className="text-center sm:text-left sm:max-w-[55%]">
            <p
              className="text-[12px] font-medium tracking-[2px]"
              style={{ color: "#D8F3DC" }}
            >
              VACATION RENTAL PORTAL
            </p>
            <p
              className="mt-4 leading-[1.5]"
              style={{ color: "white", fontSize: "28px", fontWeight: 500 }}
            >
              仲間と過ごす、最高の一棟貸しを見つけよう
            </p>
            <p
              className="mt-3 text-[14px]"
              style={{ color: "#A7C4B5" }}
            >
              空き状況と料金がひと目でわかる。全国の貸別荘を比較・検索。
            </p>
            <div className="mt-8">
              <SearchForm
                areas={areaList.map(({ id, name, slug }) => ({ id, name, slug }))}
                variant="hero"
              />
            </div>
          </div>
        </div>

        {/* YADOKAウォーターマーク */}
        <span
          className="absolute bottom-4 right-6 text-[12px] tracking-[1px] pointer-events-none select-none"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          YADOKA
        </span>
      </section>

      {/* エリアから探す */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-xl font-bold text-gray-900 mb-6">エリアから探す</h2>
        {areaList.length > 0 ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {areaList.map((area) => (
              <li key={area.id}>
                <Link
                  href={`/area/${area.slug}`}
                  className="group block rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* アスペクト比固定でCLS防止 */}
                  <div className="relative aspect-[3/2]">
                    {area.image_url && (
                      <Image
                        src={getImageUrl(area.image_url, { width: 400 })}
                        alt={area.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                    {/* オーバーレイ：画像あり→グラデーション、なし→グリーン単色 */}
                    <div
                      className={`absolute inset-0 flex flex-col justify-end p-3 ${
                        area.image_url
                          ? "bg-gradient-to-t from-black/65 via-black/20 to-transparent"
                          : "bg-[#1B4332]"
                      }`}
                    >
                      <p className="text-white font-semibold text-sm leading-tight">{area.name}</p>
                      <p className="text-white/75 text-xs mt-0.5">{area.prefecture}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">現在表示できるエリアがありません。</p>
        )}
      </section>

      {/* テーマから探す */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">こだわり条件から探す</h2>
          {tagList.length > 0 ? (
            <ul className="flex flex-wrap gap-3">
              {tagList.map((tag) => (
                <li key={tag.id}>
                  {tag.image_url ? (
                    <Link
                      href={`/theme/${tag.slug}`}
                      className="group flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white pl-1 pr-4 py-1 hover:border-[#2D6A4F] hover:shadow-sm transition-all"
                    >
                      <div className="relative h-8 w-8 rounded-lg overflow-hidden shrink-0">
                        <Image
                          src={getImageUrl(tag.image_url, { width: 64 })}
                          alt=""
                          fill
                          sizes="32px"
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-[#1B4332] transition-colors">
                        {tag.name}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href={`/theme/${tag.slug}`}
                      className="group flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#2D6A4F] hover:text-[#1B4332] transition-colors"
                    >
                      {tag.icon_name && (
                        <TagIcon iconName={tag.icon_name} size={15} className="text-gray-400 group-hover:text-[#2D6A4F] transition-colors" />
                      )}
                      {tag.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">現在表示できるタグがありません。</p>
          )}
        </div>
      </section>
    </>
  );
}
