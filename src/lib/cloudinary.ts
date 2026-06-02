type OptimizeOptions = {
  width?: number;
  height?: number;
  quality?: string | number;
};

export function getOptimizedUrl(url: string, options: OptimizeOptions = {}): string {
  if (!url.includes("res.cloudinary.com")) return url;

  const { width, height, quality = "auto" } = options;
  const parts = ["f_auto", `q_${quality}`];
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);

  return url.replace("/image/upload/", `/image/upload/${parts.join(",")}/`);
}

export function getUnsplashUrl(url: string, options: { width?: number; quality?: number } = {}): string {
  if (!url.includes("images.unsplash.com")) return url;

  const { width = 800, quality = 75 } = options;
  const u = new URL(url);
  u.searchParams.set("w", String(width));
  u.searchParams.set("q", String(quality));
  u.searchParams.set("fm", "webp");
  u.searchParams.set("fit", "crop");
  return u.toString();
}

// Cloudinary / Unsplash どちらも透過的に最適化
export function getImageUrl(url: string, options: { width?: number; quality?: number } = {}): string {
  if (url.includes("res.cloudinary.com")) return getOptimizedUrl(url, options);
  if (url.includes("images.unsplash.com")) return getUnsplashUrl(url, options);
  return url;
}
