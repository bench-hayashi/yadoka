"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import MultiPropertyCalendar from "@/components/owner/MultiPropertyCalendar";

function CalendarContent() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const initialStart = searchParams.get("start") ?? undefined;

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">物件カレンダー</h1>
        <p className="mt-1 text-sm text-gray-500">
          全物件の空室状況と料金を一覧で確認・編集できます。
        </p>
      </div>
      <MultiPropertyCalendar ownerId={user.id} initialStartDate={initialStart} />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">
          読み込み中...
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
