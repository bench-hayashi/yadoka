import { Fragment } from "react";
import { Zap, MessageSquare, ShieldCheck, Search, Mail, ChevronRight } from "lucide-react";

// 初回訪問者向けの価値訴求セクション。
// 「日付と人数を選ぶだけで料金が自動表示 → 手間なく安全に予約連絡」を伝える。
// 物件数には触れず、体験のかんたんさ・安全性のみを訴求する。
// 静的表示のみ（クライアントJS不要）の Server Component。
export default function FirstTimeValueProp() {
  const features = [
    {
      Icon: Zap,
      title: "選んだ瞬間、料金を自動計算",
      body: "日付と人数を選ぶだけで、合計料金をシステムがその場で表示。問い合わせなくても、費用がひと目でわかります。",
    },
    {
      Icon: MessageSquare,
      title: "金額に納得してから連絡",
      body: "表示された料金に納得したら、そのまま予約のご相談。オーナーから直接お返事が届きます。",
    },
    {
      Icon: ShieldCheck,
      title: "運営が確認した物件だけ",
      body: "すべての物件は掲載前に運営が審査。やり取りはサイト内で完結し、安心してご利用いただけます。",
    },
  ];

  const steps = [
    { Icon: Search, label: "1. さがす", sub: "エリアや条件から物件を探す" },
    { Icon: Zap, label: "2. 料金が出る", sub: "日付・人数を選ぶと自動表示" },
    { Icon: Mail, label: "3. 連絡する", sub: "オーナーへ予約のご相談" },
  ];

  return (
    <section className="bg-[#FAF7F0] py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 見出し */}
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1B4332] px-3.5 py-1.5 text-xs font-medium text-[#F5EBCF]">
            YADOKA がはじめての方へ
          </span>
          <h2 className="mt-3.5 text-xl sm:text-2xl font-medium leading-snug text-[#1B4332]">
            日付と人数を選ぶだけ。
            <br className="hidden sm:block" />
            料金はその場で、自動で表示。
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-gray-600">
            見積り依頼も、返事を待つ時間もありません。金額を確かめてから、オーナーへそのままご相談できます。
          </p>
        </div>

        {/* 特長カード */}
        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map(({ Icon, title, body }) => (
            <li key={title} className="rounded-xl border border-[#1B4332]/15 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5EBCF] text-[#B8860B]">
                <Icon size={22} aria-hidden="true" />
              </div>
              <p className="mt-3 text-[15px] font-medium text-[#1B4332]">{title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">{body}</p>
            </li>
          ))}
        </ul>

        {/* 3ステップ */}
        <div className="mt-7 rounded-xl border border-[#1B4332]/15 bg-white px-4 py-5">
          <p className="text-center text-[13px] font-medium text-[#1B4332]">ご予約までは、たったの3ステップ</p>
          <div className="mt-3.5 flex items-start justify-center gap-1 sm:gap-2">
            {steps.map(({ Icon, label, sub }, i) => (
              <Fragment key={label}>
                <div className="flex-1 max-w-[150px] text-center">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#1B4332] text-[#F5EBCF]">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-[13px] font-medium text-[#1B4332]">{label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{sub}</p>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight size={18} className="mt-2.5 shrink-0 text-[#B8860B]" aria-hidden="true" />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
