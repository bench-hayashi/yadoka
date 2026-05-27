import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SearchForm from "@/components/SearchForm";

type Area = {
  id: string;
  name: string;
  prefecture: string;
  slug: string;
  sort_order: number;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
  category: string;
};

export default async function Home() {
  const [{ data: areas }, { data: tags }] = await Promise.all([
    supabase.from("areas").select("id, name, prefecture, slug, sort_order").order("sort_order"),
    supabase.from("tags").select("id, name, slug, category").eq("category", "theme"),
  ]);

  const areaList: Area[] = areas ?? [];
  const tagList: Tag[] = tags ?? [];

  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden flex items-center min-h-[400px] sm:h-[480px]"
        style={{ background: "linear-gradient(135deg, #0d2818 0%, #1B4332 40%, #2D6A4F 100%)" }}
      >
        {/* 背景画像（右側透かし） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200"
          alt=""
          className="absolute top-0 right-0 h-full object-cover opacity-30 pointer-events-none w-full sm:w-[60%]"
        />

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
                  href={`/search?area=${area.slug}`}
                  className="block rounded-xl border border-gray-200 bg-white px-4 py-5 text-center hover:border-[#2D6A4F] hover:shadow-sm transition-all"
                >
                  <p className="font-semibold text-gray-900">{area.name}</p>
                  <p className="mt-1 text-xs text-gray-400">{area.prefecture}</p>
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
                  <Link
                    href={`/search?tag=${tag.slug}`}
                    className="inline-block rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:border-[#2D6A4F] hover:text-[#1B4332] transition-colors"
                  >
                    {tag.name}
                  </Link>
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
