type PricingRule = {
  season:        string;
  day_type:      string;
  minimum_price: number;
  adult_fee:     number;
  child_fee:     number;
  infant_fee:    number;
  pet_fee:       number;
};

type Props = {
  pricingRules: PricingRule[];
};

const SEASON_ORDER = ["low", "mid", "high"] as const;

const SEASON_LABEL: Record<string, string> = {
  low:  "ローシーズン",
  mid:  "ミドルシーズン",
  high: "ハイシーズン",
};

const DAY_TYPES = [
  { key: "weekday", label: "平日" },
  { key: "weekend", label: "休日" },
] as const;

function fmt(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function FeeRow({ label, fee }: { label: string; fee: number }) {
  const isFree = fee === 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs tabular-nums ${isFree ? "text-gray-400" : "text-gray-700 font-medium"}`}>
        {isFree ? "無料" : `+${fmt(fee)}`}
      </span>
    </div>
  );
}

export default function PricingTable({ pricingRules }: Props) {
  // season → day_type → rule
  const ruleMap = new Map<string, Map<string, PricingRule>>();
  for (const rule of pricingRules) {
    if (!ruleMap.has(rule.season)) ruleMap.set(rule.season, new Map());
    ruleMap.get(rule.season)!.set(rule.day_type, rule);
  }

  const seasons = SEASON_ORDER.filter(s => ruleMap.has(s));
  if (seasons.length === 0) return null;

  return (
    <div className="space-y-5">
      {seasons.map(season => (
        <div key={season}>
          {/* シーズンヘッダー */}
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            {SEASON_LABEL[season]}
          </p>

          {/* 平日 / 休日 カード */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DAY_TYPES.map(({ key, label }) => {
              const rule = ruleMap.get(season)?.get(key);
              if (!rule) return null;
              return (
                <div
                  key={key}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                >
                  {/* カードヘッダー */}
                  <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-2.5">
                    <span className="text-xs font-semibold text-gray-600">{label}</span>
                    <span className="text-lg font-bold text-[#1B4332] tabular-nums">
                      {fmt(rule.minimum_price)}
                    </span>
                  </div>

                  {/* 人数別追加料金 */}
                  <div className="px-4 py-3 space-y-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-2">
                      人数別追加料金
                    </p>
                    <FeeRow label="大人（1名）"   fee={rule.adult_fee}   />
                    <FeeRow label="子供（1名）"   fee={rule.child_fee}   />
                    <FeeRow label="幼児（1名）"   fee={rule.infant_fee}  />
                    <FeeRow label="ペット（1頭）" fee={rule.pet_fee}     />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
