import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Area = {
  id: string;
  name: string;
  prefecture: string;
  slug: string;
  sort_order: number;
};

export default async function Home() {
  const { data: areas } = await supabase
    .from("areas")
    .select("id, name, prefecture, slug, sort_order")
    .order("sort_order");

  return (
    <>
      {/* Hero */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            探しやすく、比べやすい。
            <br className="hidden sm:block" />
            貸別荘探しはYADOKA
          </h1>
          <p className="mt-5 text-base sm:text-lg text-gray-500">
            全国の貸別荘・一棟貸しを、空き状況と料金つきで比較
          </p>
        </div>
      </section>

      {/* Area list */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-xl font-bold text-gray-900 mb-8">エリアから探す</h2>

        {areas && areas.length > 0 ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {areas.map((area: Area) => (
              <li key={area.id}>
                <Link
                  href={`/area/${area.slug}`}
                  className="block rounded-xl border border-gray-200 bg-white px-4 py-5 text-center hover:border-gray-400 hover:shadow-sm transition-all"
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
    </>
  );
}
