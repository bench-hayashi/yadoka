type PricingRule = {
  season: string;
  day_type: string;
  price_per_night: number;
};

type Props = {
  pricingRules: PricingRule[];
};

const SEASON_ORDER = ["low", "mid", "high"] as const;
const SEASON_LABEL: Record<string, string> = {
  low: "ローシーズン",
  mid: "ミドルシーズン",
  high: "ハイシーズン",
};

const DAY_TYPES = [
  { key: "weekday", label: "平日" },
  { key: "holiday", label: "休日" },
] as const;

function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}

export default function PricingTable({ pricingRules }: Props) {
  // season → day_type → price のルックアップマップを構築
  const priceMap = new Map<string, Map<string, number>>();
  for (const rule of pricingRules) {
    if (!priceMap.has(rule.season)) {
      priceMap.set(rule.season, new Map());
    }
    priceMap.get(rule.season)!.set(rule.day_type, rule.price_per_night);
  }

  const seasons = SEASON_ORDER.filter((s) => priceMap.has(s));

  if (seasons.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left font-semibold text-gray-500 w-40" />
            {DAY_TYPES.map(({ key, label }) => (
              <th
                key={key}
                className="px-4 py-3 text-right font-semibold text-gray-700"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {seasons.map((season, i) => {
            const dayMap = priceMap.get(season)!;
            return (
              <tr
                key={season}
                className={i % 2 === 1 ? "bg-gray-50" : "bg-white"}
              >
                <td className="px-4 py-3 font-medium text-gray-700">
                  {SEASON_LABEL[season]}
                </td>
                {DAY_TYPES.map(({ key }) => {
                  const price = dayMap.get(key);
                  return (
                    <td
                      key={key}
                      className="px-4 py-3 text-right tabular-nums text-gray-900"
                    >
                      {price !== undefined ? (
                        <span className="font-semibold">{formatPrice(price)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
