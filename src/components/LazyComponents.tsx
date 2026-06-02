"use client";

import dynamic from "next/dynamic";

export const LazyAvailabilityCalendar = dynamic(
  () => import("@/components/AvailabilityCalendar"),
  {
    ssr: false,
    loading: () => <div className="h-72 rounded-xl bg-gray-100 animate-pulse" />,
  },
);

export const LazyPriceSimulator = dynamic(
  () => import("@/components/PriceSimulator"),
  {
    ssr: false,
    loading: () => <div className="mt-4 h-52 rounded-2xl bg-gray-100 animate-pulse" />,
  },
);
