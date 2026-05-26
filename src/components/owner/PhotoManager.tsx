"use client";

import { useEffect, useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import { supabase } from "@/lib/supabase";

type FacilityImage = {
  id: string;
  facility_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_hero: boolean;
};

type Props = {
  facilityId: string;
};

export default function PhotoManager({ facilityId }: Props) {
  const [images, setImages] = useState<FacilityImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchImages() {
    const { data } = await supabase
      .from("facility_images")
      .select("id, facility_id, url, alt_text, sort_order, is_hero")
      .eq("facility_id", facilityId)
      .order("sort_order");
    setImages((data ?? []) as FacilityImage[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleUploadSuccess(result: any) {
    const url: string = result?.info?.secure_url;
    if (!url) return;

    const maxOrder = images.length > 0 ? Math.max(...images.map((i) => i.sort_order)) : 0;

    await supabase.from("facility_images").insert({
      facility_id: facilityId,
      url,
      sort_order: maxOrder + 1,
      is_hero: images.length === 0,
    });

    await fetchImages();
  }

  async function handleSetHero(imageId: string) {
    setSaving(true);
    // Optimistic update: immediately reflect hero change in UI
    setImages(images.map((img) => ({ ...img, is_hero: img.id === imageId })));
    await supabase
      .from("facility_images")
      .update({ is_hero: false })
      .eq("facility_id", facilityId);
    await supabase
      .from("facility_images")
      .update({ is_hero: true })
      .eq("id", imageId);
    await fetchImages();
    setSaving(false);
  }

  async function handleDelete(imageId: string) {
    if (!confirm("この画像を削除しますか？")) return;
    setSaving(true);
    await supabase.from("facility_images").delete().eq("id", imageId);
    await fetchImages();
    setSaving(false);
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= images.length) return;

    setSaving(true);

    // Swap positions in array, then renumber sequentially to avoid duplicate sort_order issues
    const next = [...images];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    const reordered = next.map((img, i) => ({ ...img, sort_order: i + 1 }));

    // Optimistic update for immediate UI feedback
    setImages(reordered);

    await Promise.all(
      reordered.map((img) =>
        supabase.from("facility_images").update({ sort_order: img.sort_order }).eq("id", img.id)
      )
    );

    await fetchImages();
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* アップロードボタン */}
      <CldUploadWidget
        uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
        options={{
          folder: "yadoka/facilities",
          multiple: true,
          resourceType: "image",
        }}
        onSuccess={handleUploadSuccess}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => open()}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-600 hover:border-[#2D6A4F] hover:text-[#1B4332] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            画像をアップロード
          </button>
        )}
      </CldUploadWidget>

      {/* ローディング */}
      {loading && (
        <p className="text-sm text-gray-400">読み込み中...</p>
      )}

      {/* 画像なし */}
      {!loading && images.length === 0 && (
        <p className="text-sm text-gray-400">まだ画像がありません。</p>
      )}

      {/* 画像グリッド */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative rounded-xl overflow-hidden border border-gray-200 bg-white group"
            >
              {/* 順番バッジ */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
                  {index + 1}
                </span>
                {img.is_hero === true && (
                  <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-semibold text-yellow-900">
                    ★ ヒーロー
                  </span>
                )}
              </div>

              {/* 画像 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt_text ?? ""}
                className="w-full aspect-video object-cover"
              />

              {/* 操作オーバーレイ */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                {/* ヒーローに設定 */}
                {img.is_hero !== true && (
                  <button
                    type="button"
                    onClick={() => handleSetHero(img.id)}
                    disabled={saving}
                    title="ヒーローに設定"
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-300 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    ヒーローに設定
                  </button>
                )}

                {/* 並び替え */}
                <div className="flex gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => handleMove(index, "up")}
                    disabled={saving || index === 0}
                    title="上に移動"
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-white/90 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                    前へ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, "down")}
                    disabled={saving || index === images.length - 1}
                    title="下に移動"
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-white/90 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    後へ
                  </button>
                </div>

                {/* 削除 */}
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  disabled={saving}
                  title="削除"
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
