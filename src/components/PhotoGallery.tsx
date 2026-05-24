"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

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

  const [main, ...subs] = photos;
  const gridSubs = subs.slice(0, 4);

  return (
    <>
      {/* ギャラリーグリッド */}
      <div className="w-full">
        {/* PC：メイン＋サブグリッド */}
        <div className="hidden md:grid md:grid-cols-2 gap-2 rounded-2xl overflow-hidden">
          {/* メイン画像 */}
          <button
            onClick={() => openModal(0)}
            className="relative aspect-[4/3] overflow-hidden group"
            aria-label={main.alt_text ?? "メイン画像を拡大"}
          >
            <Image
              src={main.url}
              alt={main.alt_text ?? ""}
              fill
              sizes="(max-width: 1280px) 50vw, 640px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </button>

          {/* サブ画像 2×2 */}
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => {
              const photo = gridSubs[i];
              return photo ? (
                <button
                  key={photo.url}
                  onClick={() => openModal(i + 1)}
                  className="relative aspect-[4/3] overflow-hidden group"
                  aria-label={photo.alt_text ?? `画像${i + 2}を拡大`}
                >
                  <Image
                    src={photo.url}
                    alt={photo.alt_text ?? ""}
                    fill
                    sizes="(max-width: 1280px) 25vw, 320px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* 最後のセルで表示されていない画像がある場合は枚数オーバーレイ */}
                  {i === 3 && photos.length > 5 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-lg font-semibold">
                        +{photos.length - 5}
                      </span>
                    </div>
                  )}
                </button>
              ) : (
                <div key={i} className="aspect-[4/3] bg-gray-100" />
              );
            })}
          </div>
        </div>

        {/* モバイル：メイン画像＋ボタン */}
        <div className="md:hidden">
          <button
            onClick={() => openModal(0)}
            className="relative w-full aspect-video overflow-hidden rounded-xl group"
            aria-label={main.alt_text ?? "画像を拡大"}
          >
            <Image
              src={main.url}
              alt={main.alt_text ?? ""}
              fill
              sizes="100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </button>
          {photos.length > 1 && (
            <button
              onClick={() => openModal(0)}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              全{photos.length}枚を見る
            </button>
          )}
        </div>
      </div>

      {/* モーダル */}
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
              src={photos[modalIndex].url}
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
