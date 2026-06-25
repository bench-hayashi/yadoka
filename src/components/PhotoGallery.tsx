"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { getOptimizedUrl } from "@/lib/cloudinary";

type Photo = {
  url: string;
  alt_text?: string | null;
};

type Props = {
  photos: Photo[];
};

export default function PhotoGallery({ photos }: Props) {
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

  return (
    <>
      {/* ヒーロー：Airbnb/Booking型サムネイル一覧（PCは大1枚＋小4枚の2x2）。
          モバイルは大1枚のみ表示し、残りはモーダルで確認。
          写真5枚未満は2x2が崩れるため大1枚にフォールバック。 */}
      <div className="relative">
        {photos.length >= 5 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 md:h-[420px] rounded-2xl overflow-hidden">
            {/* 大画像（PCで左半分・2行ぶち抜き／モバイルはフル幅16:9） */}
            <button
              onClick={() => openModal(0)}
              className="group relative md:col-span-2 md:row-span-2 aspect-video md:aspect-auto overflow-hidden bg-gray-100"
              aria-label={photos[0].alt_text ?? "写真を拡大"}
            >
              <Image
                src={getOptimizedUrl(photos[0].url, { width: 1280 })}
                alt={photos[0].alt_text ?? ""}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </button>

            {/* 小画像4枚（PCのみ。右側2x2） */}
            {photos.slice(1, 5).map((p, i) => (
              <button
                key={i}
                onClick={() => openModal(i + 1)}
                className="group relative hidden md:block overflow-hidden bg-gray-100"
                aria-label={p.alt_text ?? "写真を拡大"}
              >
                <Image
                  src={getOptimizedUrl(p.url, { width: 640 })}
                  alt={p.alt_text ?? ""}
                  fill
                  sizes="25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => openModal(0)}
            className="group relative block aspect-video w-full overflow-hidden rounded-2xl bg-gray-100"
            aria-label={photos[0].alt_text ?? "写真を拡大"}
          >
            <Image
              src={getOptimizedUrl(photos[0].url, { width: 1280 })}
              alt={photos[0].alt_text ?? ""}
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </button>
        )}

        {/* 「写真をすべて見る」オーバーレイ（右下固定。全枚数のモーダルを開く） */}
        <button
          onClick={() => openModal(0)}
          className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white/95 px-3.5 py-2 text-sm font-medium text-gray-800 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          aria-label={`写真をすべて見る（全${photos.length}枚）`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h4v6H4V6zM14 4h4a2 2 0 012 2v4h-6V4zM4 14h6v6H6a2 2 0 01-2-2v-4zM14 14h6v4a2 2 0 01-2 2h-4v-6z" />
          </svg>
          写真をすべて見る
          <span className="text-gray-500">（{photos.length}）</span>
        </button>
      </div>

      {/* モーダル：全写真を1枚ずつ確認（既存のまま） */}
      {modalIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={closeModal}
        >
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <p className="absolute top-5 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {modalIndex + 1} / {photos.length}
          </p>

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
