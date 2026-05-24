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
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function SearchForm({ areas }: Props) {
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

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-md p-6"
    >
      <div className="flex flex-col md:flex-row gap-4">
        {/* エリア */}
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">エリア</label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <label className="text-xs font-medium text-gray-500">チェックイン</label>
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
            className="h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* チェックアウト */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">チェックアウト</label>
          <input
            type="date"
            value={checkout}
            min={checkin}
            onChange={(e) => setCheckout(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 人数 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">人数</label>
          <input
            type="number"
            value={guests}
            min={1}
            max={30}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="h-11 w-24 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 検索ボタン */}
        <div className="flex flex-col justify-end">
          <button
            type="submit"
            className="h-11 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap"
          >
            この条件で検索する
          </button>
        </div>
      </div>
    </form>
  );
}
