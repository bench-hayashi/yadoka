import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YADOKA",
    short_name: "YADOKA",
    description: "貸別荘・一棟貸し専門の検索ポータル",
    start_url: "/",
    display: "standalone",
    theme_color: "#1B4332",
    background_color: "#FAFAF8",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
