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
      <section className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] px-4 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-base sm:text-lg font-medium text-green-100 tracking-wide">
            貸別荘・一棟貸しを探すなら
          </p>
          <h1 className="mt-2 text-6xl sm:text-8xl font-extrabold text-white tracking-tight">
            YADOKA
          </h1>
          <p className="mt-4 text-sm sm:text-base text-green-100 leading-relaxed">
            空き状況と料金がひと目でわかる。全国の貸別荘を比較・検索。
          </p>
          <div className="mt-10 max-w-4xl mx-auto">
            <SearchForm areas={areaList.map(({ id, name, slug }) => ({ id, name, slug }))} />
          </div>
        </div>
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
