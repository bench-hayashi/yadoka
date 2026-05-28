import type { Metadata } from "next";
import FavoritesContent from "./_components/FavoritesContent";

export const metadata: Metadata = {
  title: "お気に入り",
};

export default function FavoritesPage() {
  return <FavoritesContent />;
}
