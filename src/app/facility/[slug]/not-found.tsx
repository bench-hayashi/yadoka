import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
      <p className="text-5xl font-bold text-gray-200">404</p>
      <h1 className="mt-4 text-xl font-bold text-gray-800">
        お探しの施設が見つかりませんでした
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        URLが間違っているか、施設の掲載が終了している可能性があります。
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        トップページへ戻る
      </Link>
    </div>
  );
}
