import Link from "next/link";

export default function ThemeNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-gray-200 mb-6">404</p>
      <h1 className="text-xl font-bold text-gray-900 mb-2">
        お探しのテーマが見つかりませんでした
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        URLが正しいかご確認いただくか、トップページからテーマをお選びください。
      </p>
      <Link
        href="/"
        className="rounded-lg bg-[#1B4332] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2D6A4F] transition-colors"
      >
        トップページへ戻る
      </Link>
    </div>
  );
}
