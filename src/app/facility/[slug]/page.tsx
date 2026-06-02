import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getFacilityBySlug, getAvailability, getLowestPrice } from "@/lib/facilities";
import PhotoGallery from "@/components/PhotoGallery";
import PricingTable from "@/components/PricingTable";
import FavoriteButton from "@/components/FavoriteButton";
import JsonLd from "@/components/JsonLd";
import { LazyAvailabilityCalendar as AvailabilityCalendar, LazyPriceSimulator as PriceSimulator } from "@/components/LazyComponents";
import TagIcon from "@/components/TagIcon";

const SITE_URL = "https://yadoka.vercel.app";

type Props = {
  params: Promise<{ slug: string }>;
};

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const TAG_CATEGORY_LABEL: Record<string, string> = {
  facility: "設備",
  theme: "テーマ",
  amenity: "アメニティ",
};
const TAG_CATEGORY_ORDER = ["facility", "amenity", "theme"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const facility = await getFacilityBySlug(slug);
  if (!facility) return {};
  const description = facility.description?.slice(0, 120) ?? undefined;
  const heroImage =
    facility.facility_images.find((img) => img.is_hero) ?? facility.facility_images[0];
  return {
    title: facility.name,
    description,
    openGraph: {
      title: facility.name,
      description,
      ...(heroImage && { images: [{ url: heroImage.url }] }),
      url: `${SITE_URL}/facility/${slug}`,
    },
  };
}

export default async function FacilityPage({ params }: Props) {
  const { slug } = await params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = addDays(today, 60);

  const facility = await getFacilityBySlug(slug);
  if (!facility) notFound();

  const availabilityData = await getAvailability(
    Number(facility.id),
    toDateStr(today),
    toDateStr(endDate),
  );

  const photos = facility.facility_images.map((img) => ({
    url: img.url,
    alt_text: img.alt_text,
  }));

  // タグをカテゴリ別にグループ化
  const tagsByCategory = new Map<string, { id: string; name: string; slug: string; icon_name: string | null }[]>();
  for (const ft of facility.facility_tags) {
    const { category, ...tag } = ft.tags;
    if (!tagsByCategory.has(category)) tagsByCategory.set(category, []);
    tagsByCategory.get(category)!.push(tag);
  }

  const availabilityForCalendar = availabilityData.map((a) => ({
    target_date: a.target_date,
    is_available: a.is_available,
  }));

  const lowestPrice = getLowestPrice(facility.pricing_rules);

  const heroImage = facility.facility_images.find((img) => img.is_hero) ?? facility.facility_images[0];

  const lodgingSchema = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": facility.name,
    ...(facility.description && { "description": facility.description }),
    "address": {
      "@type": "PostalAddress",
      ...(facility.areas?.prefecture && { "addressRegion": facility.areas.prefecture }),
      ...(facility.address && { "streetAddress": facility.address }),
    },
    ...(facility.latitude != null && facility.longitude != null && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": facility.latitude,
        "longitude": facility.longitude,
      },
    }),
    ...(heroImage && { "image": heroImage.url }),
    "amenityFeature": facility.facility_tags.map((ft) => ({
      "@type": "LocationFeatureSpecification",
      "name": ft.tags.name,
      "value": true,
    })),
    ...(facility.checkin_time && { "checkinTime": facility.checkin_time }),
    ...(facility.checkout_time && { "checkoutTime": facility.checkout_time }),
    ...(facility.bedrooms != null && { "numberOfRooms": facility.bedrooms }),
    "url": `${SITE_URL}/facility/${facility.slug}`,
  };

  return (
    <div className="bg-white">
      <JsonLd data={lodgingSchema} />

      {/* ギャラリー */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <PhotoGallery photos={photos} />
      </div>

      {/* 2カラムレイアウト */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* 左カラム：メイン情報 */}
          <div className="flex-1 min-w-0 space-y-10">
            {/* タイトル */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{facility.name}</h1>
                <FavoriteButton facilityId={Number(facility.id)} />
              </div>
              {facility.areas && (
                <Link
                  href={`/search?area=${facility.areas.slug}`}
                  className="mt-1 inline-block text-sm text-[#1B4332] hover:text-[#2D6A4F] transition-colors"
                >
                  {facility.areas.name}・{facility.areas.prefecture}
                </Link>
              )}
            </div>

            {/* 説明文 */}
            {facility.description && (
              <section>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {facility.description}
                </p>
              </section>
            )}

            {/* 設備・アメニティ */}
            {tagsByCategory.size > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">設備・アメニティ</h2>
                <div className="space-y-4">
                  {TAG_CATEGORY_ORDER.filter((cat) => tagsByCategory.has(cat)).map((cat) => (
                    <div key={cat}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                        {TAG_CATEGORY_LABEL[cat] ?? cat}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tagsByCategory.get(cat)!.map((tag) => (
                          <span
                            key={tag.id}
                            className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700"
                          >
                            {tag.icon_name && (
                              <TagIcon iconName={tag.icon_name} size={14} className="text-gray-400 shrink-0" />
                            )}
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 料金テーブル */}
            {facility.pricing_rules.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">料金</h2>
                <PricingTable pricingRules={facility.pricing_rules} />
                <p className="mt-2 text-xs text-gray-400">※ 表示料金は1泊あたりの金額です。</p>
              </section>
            )}

            {/* 空室カレンダー */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">空室状況</h2>
              <AvailabilityCalendar availability={availabilityForCalendar} />
            </section>

            {/* FAQ */}
            {(() => {
              const isPetFriendly = facility.facility_tags.some(
                (ft) => ft.tags.name === "ペット可",
              );
              type FaqItem = { q: string; a: string };
              const faqs: FaqItem[] = [];

              if (facility.checkin_time || facility.checkout_time) {
                const ci = facility.checkin_time ?? "—";
                const co = facility.checkout_time ?? "—";
                faqs.push({
                  q: "チェックイン・チェックアウト時間は？",
                  a: `チェックインは${ci}から、チェックアウトは${co}までです。`,
                });
              }

              faqs.push({
                q: "最大何名まで宿泊できますか？",
                a: facility.bedrooms != null
                  ? `最大${facility.max_guests}名まで宿泊可能です。寝室は${facility.bedrooms}室あります。`
                  : `最大${facility.max_guests}名まで宿泊可能です。`,
              });

              if (facility.parking_spaces != null) {
                faqs.push({
                  q: "駐車場はありますか？",
                  a: facility.parking_spaces > 0
                    ? `${facility.parking_spaces}台分の駐車場があります。`
                    : "駐車場はございません。",
                });
              }

              faqs.push({
                q: "ペットは連れていけますか？",
                a: isPetFriendly
                  ? "はい、ペット同伴可能です。詳細は施設へお問い合わせください。"
                  : "申し訳ございませんが、ペットの同伴はできません。",
              });

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
          </div>

          {/* 右カラム：サイドバー */}
          <aside className="lg:w-80 shrink-0">
            <div className="sticky top-20 space-y-4">
              {/* 料金目安 */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
                <p className="text-2xl font-bold text-gray-900">
                  {lowestPrice !== null ? (
                    <>
                      <span className="text-[#1B4332]">
                        ¥{lowestPrice.toLocaleString("ja-JP")}
                      </span>
                      <span className="text-sm font-normal text-gray-400">〜 / 泊</span>
                    </>
                  ) : (
                    <span className="text-base font-normal text-gray-400">料金はお問い合わせ</span>
                  )}
                </p>

                {/* 宿泊条件 */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-gray-100 pt-4">
                  <dt className="text-gray-400">最大定員</dt>
                  <dd className="font-medium text-gray-900">最大{facility.max_guests}名</dd>

                  {facility.bedrooms != null && (
                    <>
                      <dt className="text-gray-400">寝室</dt>
                      <dd className="font-medium text-gray-900">{facility.bedrooms}室</dd>
                    </>
                  )}
                  {facility.bathrooms != null && (
                    <>
                      <dt className="text-gray-400">バスルーム</dt>
                      <dd className="font-medium text-gray-900">{facility.bathrooms}室</dd>
                    </>
                  )}
                  {facility.parking_spaces != null && (
                    <>
                      <dt className="text-gray-400">駐車場</dt>
                      <dd className="font-medium text-gray-900">{facility.parking_spaces}台</dd>
                    </>
                  )}
                  {facility.checkin_time && (
                    <>
                      <dt className="text-gray-400">チェックイン</dt>
                      <dd className="font-medium text-gray-900">{facility.checkin_time}〜</dd>
                    </>
                  )}
                  {facility.checkout_time && (
                    <>
                      <dt className="text-gray-400">チェックアウト</dt>
                      <dd className="font-medium text-gray-900">〜{facility.checkout_time}</dd>
                    </>
                  )}
                  {facility.min_nights != null && (
                    <>
                      <dt className="text-gray-400">最低泊数</dt>
                      <dd className="font-medium text-gray-900">{facility.min_nights}泊〜</dd>
                    </>
                  )}
                </dl>

              </div>
            </div>
            <PriceSimulator facilityId={Number(facility.id)} facilitySlug={slug} />
          </aside>
        </div>
      </div>
    </div>
  );
}
