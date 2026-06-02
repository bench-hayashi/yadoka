"use client";

import { useRouter } from "next/navigation";

type Area = { id: string; name: string; slug: string };

type Props = {
  areas: Area[];
  selectedAreas: string[];
  currentParams: Record<string, string | string[]>;
};

export default function AreaFilter({ areas, selectedAreas, currentParams }: Props) {
  const router = useRouter();

  function handleChange(slug: string, checked: boolean) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(currentParams)) {
      if (key === "area") continue;
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.set(key, value);
      }
    }

    const newAreas = checked
      ? [...selectedAreas.filter((a) => a !== slug), slug]
      : selectedAreas.filter((a) => a !== slug);

    newAreas.forEach((a) => params.append("area", a));

    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="mb-6 pb-6 border-b border-gray-100">
      <p className="text-sm font-semibold text-gray-900 mb-3">エリア</p>
      <ul className="space-y-2">
        {areas.map((area) => (
          <li key={area.id}>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedAreas.includes(area.slug)}
                onChange={(e) => handleChange(area.slug, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#1B4332] focus:ring-[#1B4332]"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                {area.name}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
