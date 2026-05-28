import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { searchFacilities, getLowestPrice } from "@/lib/facilities";
import FacilityCard from "@/components/FacilityCard";
import JsonLd from "@/components/JsonLd";

const SITE_URL = "https://yadoka.vercel.app";

// ── Types ─────────────────────────────────────────────────────────────────────

type PageParams = Promise<{ slug: string }>;

type Area = {
  id: string;
  name: string;
  slug: string;
  prefecture: string;
  sort_order: number;
};

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const { data: area } = await supabase
    .from("areas")
    .select("name, slug")
    .eq("slug", slug)
    .single();

  if (!area) return { title: "エリアが見つかりません | YADOKA" };

  const { data: countData } = await supabase
    .from("facilities")
    .select("id", { count: "exact", head: false })
    .eq("is_published", true)
    .eq("area_id", (
      await supabase.from("areas").select("id").eq("slug", slug).single()
    ).data?.id ?? "");

  const count = countData?.length ?? 0;

  const title = `${area.name}の貸別荘・一棟貸し一覧`;
  const description = `${area.name}エリアの貸別荘・一棟貸しを${count}件掲載。空き状況と料金をひと目で比較。お気に入りの施設を見つけましょう。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/area/${slug}`,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AreaPage({ params }: { params: PageParams }) {
  const { slug } = await params;

  const [{ data: area }, { data: allAreas }] = await Promise.all([
    supabase.from("areas").select("id, name, slug, prefecture, sort_order").eq("slug", slug).single(),
    supabase.from("areas").select("id, name, slug, prefecture, sort_order").order("sort_order"),
  ]);

  if (!area) notFound();

  const facilities = await searchFacilities({ area: slug });

  const otherAreas: Area[] = (allAreas ?? []).filter((a: Area) => a.slug !== slug);

  const pageTitle = `${area.name}の貸別荘・一棟貸し一覧`;
  const pageDescription = `${area.name}エリアの貸別荘・一棟貸しを${facilities.length}件掲載。空き状況と料金をひと目で比較。お気に入りの施設を見つけましょう。`;

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": pageTitle,
        "description": pageDescription,
        "url": `${SITE_URL}/area/${area.slug}`,
      }} />

      {/* ヒーローセクション */}
      <section
        className="relative overflow-hidden flex items-center h-40 sm:h-52"
        style={{ background: "linear-gradient(135deg, #0d2818 0%, #1B4332 40%, #2D6A4F 100%)" }}
      >
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium tracking-[2px]" style={{ color: "#D8F3DC" }}>
            VACATION RENTAL PORTAL
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white leading-snug">
            {area.name}の貸別荘・一棟貸し
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#A7C4B5" }}>
            {area.name}エリアの貸別荘を{facilities.length}件掲載中。空き状況と料金を比較できます。
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

        {/* 施設一覧 */}
        <section>
          {facilities.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200 p-16 text-center">
              <p className="text-sm text-gray-500">
                現在{area.name}エリアに掲載中の施設はありません。
              </p>
              <Link
                href="/search"
                className="mt-4 inline-block text-sm text-[#1B4332] hover:text-[#2D6A4F] transition-colors"
              >
                全エリアで探す →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilities.map((facility) => (
                <FacilityCard
                  key={facility.id}
                  facilityId={Number(facility.id)}
                  slug={facility.slug}
                  name={facility.name}
                  areaName={facility.areas?.name ?? null}
                  maxGuests={facility.max_guests}
                  tags={facility.facility_tags.map((ft) => ft.tags)}
                  heroImageUrl={facility.facility_images[0]?.url ?? null}
                  lowestPrice={getLowestPrice(facility.pricing_rules)}
                />
              ))}
            </div>
          )}
        </section>

        {/* FAQ */}
        {facilities.length > 0 && (() => {
          const guestCounts = facilities.map((f) => f.max_guests);
          const minGuests = Math.min(...guestCounts);
          const maxGuests = Math.max(...guestCounts);

          const prices = facilities
            .map((f) => getLowestPrice(f.pricing_rules))
            .filter((p): p is number => p !== null);
          const minPrice = prices.length > 0 ? Math.min(...prices) : null;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

          type FaqItem = { q: string; a: string };
          const faqs: FaqItem[] = [
            {
              q: `${area.name}エリアにはどんな貸別荘がありますか？`,
              a: minGuests === maxGuests
                ? `現在${facilities.length}件の施設を掲載中です。定員${minGuests}名に対応できる施設があります。`
                : `現在${facilities.length}件の施設を掲載中です。定員${minGuests}名〜${maxGuests}名まで対応できる施設があります。`,
            },
          ];

          if (minPrice !== null && maxPrice !== null) {
            faqs.push({
              q: "料金の目安は？",
              a: minPrice === maxPrice
                ? `1泊あたり¥${minPrice.toLocaleString("ja-JP")}からご利用いただけます。`
                : `1泊あたり¥${minPrice.toLocaleString("ja-JP")}〜¥${maxPrice.toLocaleString("ja-JP")}です。施設や時期によって異なります。`,
            });
          }

          const faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          };

          return (
            <section>
              <JsonLd data={faqSchema} />
              <h2 className="text-lg font-bold text-gray-900 mb-4">よくある質問</h2>
              <dl className="space-y-4">
                {faqs.map((f) => (
                  <div key={f.q} className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                    <dt className="text-sm font-semibold text-gray-900 mb-1">Q. {f.q}</dt>
                    <dd className="text-sm text-gray-600">A. {f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })()}

        {/* エリア説明（SEO用） */}
        <section className="rounded-2xl bg-white border border-gray-200 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {area.name}エリアの貸別荘について
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            {area.name}エリアは、豊かな自然に囲まれた人気のバケーションエリアです。
            仲間や家族とのプライベートな時間を過ごすのに最適な一棟貸しの宿が多数揃っています。
            広々としたリビングや専用の庭・テラスを備えた施設では、BBQや星空観察など、
            ホテルでは体験できない特別なひとときをお楽しみいただけます。
            チェックイン・チェックアウト時間や最大宿泊人数など、各施設の詳細をご確認のうえ、
            ご家族やグループのご旅行にぴったりの施設をお探しください。
          </p>
        </section>

        {/* 他のエリアへのリンク */}
        {otherAreas.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              他のエリアの貸別荘を探す
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {otherAreas.map((a) => (
                <Link
                  key={a.id}
                  href={`/area/${a.slug}`}
                  className="group rounded-xl bg-white border border-gray-200 px-5 py-4 hover:border-[#1B4332] hover:shadow-sm transition-all"
                >
                  <p className="text-xs text-gray-400 mb-1">{a.prefecture}</p>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-[#1B4332] transition-colors">
                    {a.name}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
