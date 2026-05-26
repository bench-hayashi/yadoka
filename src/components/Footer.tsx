import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1B4332]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <p className="text-xl font-bold text-white">YADOKA</p>
            <p className="mt-1 text-sm text-white/70">貸別荘・一棟貸し専門の検索ポータル</p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="#" className="text-sm text-white/70 hover:text-white transition-colors">
              利用規約
            </Link>
            <Link href="#" className="text-sm text-white/70 hover:text-white transition-colors">
              プライバシーポリシー
            </Link>
            <Link href="#" className="text-sm text-white/70 hover:text-white transition-colors">
              運営会社
            </Link>
            <Link href="#" className="text-sm text-white/70 hover:text-white transition-colors">
              お問い合わせ
            </Link>
          </nav>
        </div>

        <p className="mt-8 text-xs text-white/50">© 2026 YADOKA</p>
      </div>
    </footer>
  );
}
