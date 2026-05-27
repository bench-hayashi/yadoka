"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Area = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  areas: Area[];
  variant?: "hero";
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function SearchForm({ areas, variant }: Props) {
  const isHero = variant === "hero";
  const router = useRouter();
  const [area, setArea] = useState("");
  const [checkin, setCheckin] = useState(today);
  const [checkout, setCheckout] = useState(tomorrow);
  const [guests, setGuests] = useState(2);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    params.set("checkin", checkin);
    params.set("checkout", checkout);
    params.set("guests", String(guests));
    router.push(`/search?${params.toString()}`);
  }

  const labelClass = `text-xs font-medium ${isHero ? "text-white/80" : "text-gray-500"}`;
  const inputClass =
    "h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-6"
      style={
        isHero
          ? { background: "rgba(255,255,255,0.12)" }
          : { background: "white", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }
      }
    >
      <div className="flex flex-col gap-4">
        {/* 入力欄 */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* エリア */}
          <div className="flex-1 flex flex-col gap-1">
            <label className={labelClass}>エリア</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className={inputClass}
            >
              <option value="">エリアを選択</option>
              {areas.map((a) => (
                <option key={a.id} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* チェックイン */}
          <div className="flex flex-col gap-1">
            <label className={labelClass}>チェックイン</label>
            <input
              type="date"
              value={checkin}
              min={today()}
              onChange={(e) => {
                setCheckin(e.target.value);
                if (e.target.value >= checkout) {
                  const d = new Date(e.target.value);
                  d.setDate(d.getDate() + 1);
                  setCheckout(d.toISOString().split("T")[0]);
                }
              }}
              className={inputClass}
            />
          </div>

          {/* チェックアウト */}
          <div className="flex flex-col gap-1">
            <label className={labelClass}>チェックアウト</label>
            <input
              type="date"
              value={checkout}
              min={checkin}
              onChange={(e) => setCheckout(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* 人数 */}
          <div className="flex flex-col gap-1">
            <label className={labelClass}>人数</label>
            <input
              type="number"
              value={guests}
              min={1}
              max={30}
              onChange={(e) => setGuests(Number(e.target.value))}
              className={`${inputClass} w-24`}
            />
          </div>
        </div>

        {/* 検索ボタン（入力欄の下段・右寄せ） */}
        <div className="flex md:justify-end">
          <button
            type="submit"
            className="w-full md:w-auto h-11 rounded-lg px-8 text-sm font-semibold text-white transition-colors whitespace-nowrap"
            style={
              isHero
                ? { background: "#B8860B" }
                : { background: "#1B4332" }
            }
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = isHero
                ? "#9a7009"
                : "#2D6A4F";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = isHero
                ? "#B8860B"
                : "#1B4332";
            }}
          >
            この条件で検索する
          </button>
        </div>
      </div>
    </form>
  );
}
