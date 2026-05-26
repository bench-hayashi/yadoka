import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "アクセス権限なし | YADOKA",
};

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
      <p className="text-5xl font-bold text-gray-200">403</p>
      <h1 className="mt-4 text-xl font-bold text-gray-800">
        このページにアクセスする権限がありません
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        施設オーナーまたは管理者のみアクセスできるページです。
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-[#1B4332] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2D6A4F] transition-colors"
      >
        トップページへ戻る
      </Link>
    </div>
  );
}
