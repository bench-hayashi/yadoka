"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { getOptimizedUrl } from "@/lib/cloudinary";
import SizzleSlideshow from "@/components/SizzleSlideshow";

type Photo = {
  url: string;
  alt_text?: string | null;
};

type Props = {
  photos: Photo[];
  /** スライドショーに表示する最大枚数（先頭から。hero先頭順は呼び出し側で整える）。 */
  slideshowMax?: number;
};

export default function PhotoGallery({ photos, slideshowMax = 6 }: Props) {
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const openModal = (index: number) => setModalIndex(index);
  const closeModal = () => setModalIndex(null);

  const prev = useCallback(() => {
    setModalIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null));
  }, [photos.length]);

  const next = useCallback(() => {
    setModalIndex((i) => (i !== null ? (i + 1) % photos.length : null));
  }, [photos.length]);

  useEffect(() => {
    if (modalIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [modalIndex, prev, next]);

  if (photos.length === 0) return null;

  const main = photos[0];
  // 受動的に眺めるスライドショー用：先頭から最大 slideshowMax 枚に絞る。
  const slideshowImages = photos.slice(0, slideshowMax).map((p) => ({
    url: p.url,
    alt: p.alt_text ?? "",
  }));
  const hasMultiple = photos.length >= 2;

  return (
    <>
      {/* 主画像エリア：複数枚はスライドショー、1枚以下は静止画 */}
      <div className="relative w-full">
        {hasMultiple ? (
          <SizzleSlideshow images={slideshowImages} />
        ) : (
          <button
            onClick={() => openModal(0)}
            className="group relative block aspect-video w-full overflow-hidden rounded-2xl bg-gray-100"
            aria-label={main.alt_text ?? "画像を拡大"}
          >
            <Image
              src={getOptimizedUrl(main.url, { width: 1280 })}
              alt={main.alt_text ?? ""}
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </button>
        )}

        {/* 「写真をすべて見る」オーバーレイ（能動的な閲覧モーダルを開く） */}
        <button
          onClick={() => openModal(0)}
          className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-gray-800 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          aria-label={`写真をすべて見る（全${photos.length}枚）`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M4 6a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M8 18h10a2 2 0 002-2v-6"
            />
          </svg>
          写真をすべて見る
          <span className="text-gray-500">（{photos.length}）</span>
        </button>
      </div>

      {/* モーダル：全写真を1枚ずつ確認 */}
      {modalIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={closeModal}
        >
          {/* ×ボタン */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 枚数インジケーター */}
          <p className="absolute top-5 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {modalIndex + 1} / {photos.length}
          </p>

          {/* 左矢印 */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-3 sm:left-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              aria-label="前の画像"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 画像本体 */}
          <div
            className="relative mx-16 sm:mx-24 w-full max-w-5xl aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getOptimizedUrl(photos[modalIndex].url, { width: 1920 })}
              alt={photos[modalIndex].alt_text ?? ""}
              fill
              sizes="(max-width: 640px) calc(100vw - 128px), (max-width: 1280px) calc(100vw - 192px), 1024px"
              className="object-contain"
            />
          </div>

          {/* 右矢印 */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-3 sm:right-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              aria-label="次の画像"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  );
}
