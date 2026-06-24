"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getImageUrl } from "@/lib/cloudinary";

type SlideImage = {
  url: string;
  alt: string;
};

type Props = {
  images: SlideImage[];
  /** 切替間隔（ms）。Ken Burns 1枚あたりの所要時間も兼ねる。 */
  intervalMs?: number;
  className?: string;
};

/** スライドショーは重くなりすぎないよう最大枚数を制限する。 */
const MAX_SLIDES = 6;

export default function SizzleSlideshow({
  images,
  intervalMs = 5000,
  className = "",
}: Props) {
  const slides = images.slice(0, MAX_SLIDES);

  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  // 先頭(0)のみ初期ロード。表示が進むにつれ順次ロードする（ファーストビューを軽く保つ）。
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = slides.length;
  const hasMultiple = count > 1;

  // 現在の画像と「次の1枚」をロード対象に加える（クロスフェード前にプリロード）。
  useEffect(() => {
    if (count === 0) return;
    setLoaded((prev) => {
      const nextIndex = (current + 1) % count;
      if (prev.has(current) && prev.has(nextIndex)) return prev;
      const updated = new Set(prev);
      updated.add(current);
      updated.add(nextIndex);
      return updated;
    });
  }, [current, count]);

  // prefers-reduced-motion を監視（Ken Burns を無効化するため）
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 自動再生：intervalMs ごとに次の画像へ。複数枚かつ再生中のみ。
  useEffect(() => {
    if (!hasMultiple || !playing) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % count);
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasMultiple, playing, intervalMs, count]);

  if (count === 0) return null;

  // Ken Burns のバリエーション（方向違い）を index で割り当てる。
  const kbVariant = (i: number) => `kb-${i % 3}`;
  const animate = hasMultiple && !reducedMotion;

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-100 ${className}`}
    >
      {slides.map((img, i) => {
        const isActive = i === current;
        // 未ロード対象（まだ到達していない先の画像）はネットワークを発生させない。
        if (!loaded.has(i)) {
          return (
            <div
              key={`${img.url}-${i}`}
              className="absolute inset-0 bg-gray-100"
              style={{ opacity: 0 }}
              aria-hidden
            />
          );
        }
        return (
          <div
            key={`${img.url}-${i}`}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: isActive ? 1 : 0 }}
            aria-hidden={!isActive}
          >
            {/* Ken Burns 用のトランスフォーム層 */}
            <div
              className={`h-full w-full ${animate ? `kenburns ${kbVariant(i)}` : ""}`}
              style={animate ? { animationDuration: `${intervalMs * 1.4}ms` } : undefined}
            >
              <Image
                src={getImageUrl(img.url, { width: 1200 })}
                alt={img.alt}
                fill
                // 先頭は LCP 候補なので priority、残りは到達時にロード。
                // モバイルは sizes により _next/image がより小さい幅へ自動ダウンスケール。
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="object-cover"
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
              />
            </div>
          </div>
        );
      })}

      {/* ドットインジケーター */}
      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
          {slides.map((img, i) => (
            <button
              key={`dot-${img.url}-${i}`}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`${i + 1}枚目を表示`}
              aria-current={i === current}
              className={`h-1.5 rounded-full transition-all ${
                i === current
                  ? "w-5 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}

      {/* 再生 / 一時停止ボタン */}
      {hasMultiple && (
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "スライドショーを一時停止" : "スライドショーを再生"}
          className="absolute bottom-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          {playing ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      )}

      <style jsx>{`
        .kenburns {
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
          will-change: transform;
          transform-origin: center;
        }
        /* 方向違いのバリエーション（単調さを避ける） */
        .kb-0 {
          animation-name: kenburns0;
        }
        .kb-1 {
          animation-name: kenburns1;
        }
        .kb-2 {
          animation-name: kenburns2;
        }
        @keyframes kenburns0 {
          0% {
            transform: scale(1) translate(0, 0);
          }
          100% {
            transform: scale(1.12) translate(-2%, -1%);
          }
        }
        @keyframes kenburns1 {
          0% {
            transform: scale(1.12) translate(2%, 1%);
          }
          100% {
            transform: scale(1) translate(0, 0);
          }
        }
        @keyframes kenburns2 {
          0% {
            transform: scale(1) translate(1%, -1%);
          }
          100% {
            transform: scale(1.1) translate(-1%, 2%);
          }
        }
        /* reduced-motion 時は Ken Burns を無効化（クロスフェードのみ残す） */
        @media (prefers-reduced-motion: reduce) {
          .kenburns {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
