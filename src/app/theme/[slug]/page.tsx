import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { searchFacilities, getLowestPrice } from "@/lib/facilities";
import FacilityCard from "@/components/FacilityCard";

// ── Types ─────────────────────────────────────────────────────────────────────

type PageParams = Promise<{ slug: string }>;

type ThemeTag = {
  id: string;
  name: string;
  slug: string;
};

// ── SEO テキスト ──────────────────────────────────────────────────────────────

const THEME_DESCRIPTIONS: Record<string, string> = {
  "pet-friendly": "大切なペットと一緒に泊まれる一棟貸しをお探しなら、YADOKAにお任せください。ペット可の貸別荘では、愛犬・愛猫と同じ空間でくつろぎのひとときを過ごせます。広い庭やドッグランを備えた施設も多く、ペットも飼い主も思い切り楽しめる旅が実現します。施設ごとのペットルールを事前にご確認のうえ、最高の思い出を作りましょう。",
  "large-group":  "大人数でのグループ旅行・合宿・イベントに最適な一棟貸しを多数掲載しています。広々としたリビングや大型キッチン、複数の寝室を備えた施設なら、ホテルでは味わえないプライベートな時間を全員で共有できます。BBQや鍋パーティーなど、みんなで食卓を囲む特別な体験をお楽しみください。",
  "bbq":          "専用BBQスペース付きの一棟貸しで、仲間と最高のアウトドア体験を。火起こしから後片付けまで自分たちのペースで楽しめるのが貸別荘ならではの魅力です。広いデッキや庭を活かして、昼はBBQ・夜は星空を眺めながらの焚き火など、思い出に残るひとときをお過ごしください。",
  "sauna":        "サウナ付きの一棟貸しで、プライベートなととのい体験を。公共施設では難しいラウンジウェアでのんびり外気浴も、一棟貸しなら思う存分楽しめます。薪サウナ・遠赤外線サウナなど設備もさまざま。好みのスタイルでディープリラックスをどうぞ。",
  "hot-spring":   "温泉付きの一棟貸しで、旅の疲れを芯からほぐしましょう。家族や仲間だけで独占できる貸切風呂は、旅館・ホテルにはないプライベートな贅沢を提供します。自然の恵みをひとり占めしながら、日常を忘れる特別な時間をお過ごしください。",
  "starry-sky":   "満天の星空が見える山間・高原の一棟貸しを多数掲載。光害の少ないロケーションにある施設では、天の川や流星群を独占できます。星空観察用のデッキや望遠鏡を備えた施設もあり、星好きのカップルや家族旅行にもぴったりです。",
};

function getThemeDescription(slug: string, name: string): string {
  return (
    THEME_DESCRIPTIONS[slug] ??
    `「${name}」の条件に合う一棟貸し・貸別荘を全国からご紹介しています。施設ごとの特徴や料金をひと目で比較できるYADOKAで、ご希望にぴったりの宿をお探しください。チェックイン・チェックアウト時間や最大宿泊人数など、詳細は各施設ページでご確認いただけます。`
  );
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const { data: tag } = await supabase
    .from("tags")
    .select("name, slug")
    .eq("slug", slug)
    .eq("category", "theme")
    .single();

  if (!tag) return { title: "テーマが見つかりません | YADOKA" };

  const title = `${tag.name}の貸別荘・一棟貸し`;
  const description = `${tag.name}の条件に合う貸別荘・一棟貸しを掲載中。空き状況と料金をひと目で比較して、理想の一棟貸しを見つけましょう。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/theme/${slug}`,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ThemePage({ params }: { params: PageParams }) {
  const { slug } = await params;

  const [{ data: tag }, { data: allThemeTags }] = await Promise.all([
    supabase
      .from("tags")
      .select("id, name, slug")
      .eq("slug", slug)
      .eq("category", "theme")
      .single(),
    supabase
      .from("tags")
      .select("id, name, slug")
      .eq("category", "theme")
      .order("sort_order"),
  ]);

  if (!tag) notFound();

  const facilities = await searchFacilities({ tag: slug });

  const otherThemes: ThemeTag[] = (allThemeTags ?? []).filter((t: ThemeTag) => t.slug !== slug);

  return (
    <div className="min-h-screen bg-gray-50">

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
            {tag.name}の貸別荘・一棟貸し
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#A7C4B5" }}>
            {tag.name}の条件に合う施設を{facilities.length}件掲載中。
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

        {/* 施設一覧 */}
        <section>
          {facilities.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200 p-16 text-center">
              <p className="text-sm text-gray-500">
                現在「{tag.name}」の条件に合う掲載施設はありません。
              </p>
              <Link
                href="/search"
                className="mt-4 inline-block text-sm text-[#1B4332] hover:text-[#2D6A4F] transition-colors"
              >
                全施設から探す →
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

        {/* テーマ説明（SEO用） */}
        <section className="rounded-2xl bg-white border border-gray-200 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {tag.name}の貸別荘について
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            {getThemeDescription(tag.slug, tag.name)}
          </p>
        </section>

        {/* 他のテーマへのリンク */}
        {otherThemes.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              他の条件で貸別荘を探す
            </h2>
            <div className="flex flex-wrap gap-3">
              {otherThemes.map((t) => (
                <Link
                  key={t.id}
                  href={`/theme/${t.slug}`}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
