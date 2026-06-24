import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import SearchForm from "@/components/SearchForm";
import JsonLd from "@/components/JsonLd";
import FacilityCarousel from "@/components/FacilityCarousel";
import { getImageUrl } from "@/lib/cloudinary";
import TagIcon from "@/components/TagIcon";
import {
  getPopularAreas,
  getAvailableThisWeek,
  getAvailableNextMonth,
  getNewestFacilities,
  getFacilitiesByArea,
  getFacilitiesByTheme,
} from "@/lib/homeFeed";

const SITE_URL = "https://yadoka.vercel.app";

// TOPのデータ取得は重め。生成結果を 300 秒キャッシュ（ISR）して高速化する。
export const revalidate = 300;

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
  // 第1段：エリア/タグのマスタ・人気エリア・エリア非依存の各フィードを並列取得。
  const [
    { data: areas },
    { data: tags },
    popularAreas,
    thisWeek,
    nextMonth,
    newest,
    petFriendly,
  ] = await Promise.all([
    supabase.from("areas").select("id, name, prefecture, slug, sort_order, image_url").order("sort_order"),
    supabase.from("tags").select("id, name, slug, category, image_url, icon_name").eq("category", "theme"),
    getPopularAreas(2),
    getAvailableThisWeek(),
    getAvailableNextMonth(),
    getNewestFacilities(),
    getFacilitiesByTheme("pet-friendly"),
  ]);

  // 第2段：人気エリアに依存するエリア別フィードを並列取得。
  const areaFeeds = await Promise.all(
    popularAreas.map((area) => getFacilitiesByArea(area.slug)),
  );

  const areaList: Area[] = areas ?? [];
  const tagList: Tag[] = tags ?? [];

  // 各カルーセルに対応する ItemList 構造化データ（JSON-LD）の元データ。
  // 見出し・表示順をカルーセルと揃え、施設を itemListElement に列挙する。
  const itemLists: { name: string; facilities: typeof thisWeek }[] = [
    { name: "今週末まだ予約できる宿", facilities: thisWeek },
    ...(popularAreas[0]
      ? [{ name: `${popularAreas[0].name}の宿泊先`, facilities: areaFeeds[0] ?? [] }]
      : []),
    { name: "ペットと泊まれる宿", facilities: petFriendly },
    ...(popularAreas[1]
      ? [{ name: `${popularAreas[1].name}の宿泊先`, facilities: areaFeeds[1] ?? [] }]
      : []),
    { name: "来月泊まれる宿", facilities: nextMonth },
    { name: "新着の宿", facilities: newest },
  ].filter((list) => list.facilities.length > 0);

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "YADOKA",
        "description": "貸別荘・一棟貸し専門の検索ポータル",
        "url": SITE_URL,
      }} />

      {/* 各カルーセルの内容を ItemList として検索エンジンに伝える */}
      {itemLists.map((list) => (
        <JsonLd
          key={list.name}
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": list.name,
            "itemListElement": list.facilities.map((facility, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "url": `${SITE_URL}/facility/${facility.slug}`,
              "name": facility.name,
            })),
          }}
        />
      ))}

      {/* Hero */}
      <section className="relative overflow-hidden flex items-center min-h-[400px] sm:h-[480px] bg-[#0d2818]">
        {/* 背景画像（焚き火のある森の中の一棟貸し） */}
        <Image
          src="/hero-cabin.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          // モバイルは焚き火と建物が入るよう中央〜右寄せ、PCは中央。
          className="object-cover object-[60%_center] sm:object-center pointer-events-none"
        />

        {/* 可読性確保のための左→右グラデーションオーバーレイ */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(13,40,24,0.75) 0%, rgba(13,40,24,0.45) 50%, rgba(13,40,24,0.3) 100%)",
          }}
        />

        {/* メインコンテンツ（画像の暗い左〜中央に配置） */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-0">
          <div
            className="text-center sm:text-left sm:max-w-[55%]"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.45)" }}
          >
            <p
              className="text-[12px] font-medium tracking-[2px]"
              style={{ color: "#D8F3DC" }}
            >
              VACATION RENTAL PORTAL
            </p>
            <h1
              className="mt-4 leading-[1.5]"
              style={{ color: "white", fontSize: "28px", fontWeight: 500 }}
            >
              仲間と過ごす、最高の一棟貸しを見つけよう
            </h1>
            <p
              className="mt-3 text-[14px]"
              style={{ color: "#D8F3DC" }}
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
        <h2 className="text-xl font-bold text-gray-900 mb-6">エリアから貸別荘・一棟貸しを探す</h2>
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

      {/* おすすめの宿カルーセル群（0件セクションは FacilityCarousel が自動で非表示） */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-12">
        {/* 今週末まだ予約できる宿 */}
        <FacilityCarousel
          title="今週末まだ予約できる宿"
          badge="空室あり"
          subtitle="今日から7日以内に泊まれる"
          facilities={thisWeek}
          viewAllHref="/search"
          priority
        />

        {/* 人気エリア1つ目 */}
        {popularAreas[0] && (
          <FacilityCarousel
            title={`${popularAreas[0].name}の宿泊先`}
            subtitle={popularAreas[0].prefecture ?? undefined}
            facilities={areaFeeds[0] ?? []}
            viewAllHref={`/area/${popularAreas[0].slug}`}
          />
        )}

        {/* ペットと泊まれる宿 */}
        <FacilityCarousel
          title="ペットと泊まれる宿"
          subtitle="愛犬・愛猫と一緒に"
          facilities={petFriendly}
          viewAllHref="/theme/pet-friendly"
        />

        {/* 人気エリア2つ目 */}
        {popularAreas[1] && (
          <FacilityCarousel
            title={`${popularAreas[1].name}の宿泊先`}
            subtitle={popularAreas[1].prefecture ?? undefined}
            facilities={areaFeeds[1] ?? []}
            viewAllHref={`/area/${popularAreas[1].slug}`}
          />
        )}

        {/* 来月泊まれる宿 */}
        <FacilityCarousel
          title="来月泊まれる宿"
          badge="空室あり"
          subtitle="来月の予定を今のうちに"
          facilities={nextMonth}
          viewAllHref="/search"
        />

        {/* 新着の宿 */}
        <FacilityCarousel
          title="新着の宿"
          subtitle="新しく掲載された一棟貸し"
          facilities={newest}
          viewAllHref="/search"
        />
      </div>

      {/* テーマから探す */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">こだわり条件から貸別荘を探す</h2>
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
