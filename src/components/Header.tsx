"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-gray-900 tracking-tight">
            YADOKA
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/search" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              エリアから探す
            </Link>
            <Link href="/favorites" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              お気に入り
            </Link>
            <Link
              href="/login"
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              ログイン
            </Link>
          </nav>

          <button
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="メニューを開く"
          >
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <nav className="flex flex-col px-4 py-3 gap-1">
            <Link
              href="/search"
              className="text-sm text-gray-600 hover:text-gray-900 py-2 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              エリアから探す
            </Link>
            <Link
              href="/favorites"
              className="text-sm text-gray-600 hover:text-gray-900 py-2 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              お気に入り
            </Link>
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 py-2 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              ログイン
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
