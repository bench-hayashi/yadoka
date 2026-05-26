import { test, expect } from "@playwright/test";

const SLUG = "fuji-view-villa-kawaguchiko";

test.describe("施設詳細ページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/facility/${SLUG}`);
    await page.waitForLoadState("networkidle");
  });

  test("施設名「富士山ビューヴィラ河口湖」が表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "富士山ビューヴィラ河口湖" })).toBeVisible();
  });

  test("写真ギャラリーが表示される", async ({ page }) => {
    // PhotoGallery がレンダリングする画像
    await expect(page.locator("img").first()).toBeVisible();
  });

  test("料金テーブルが表示される（ローシーズン・ミドルシーズン・ハイシーズン）", async ({ page }) => {
    await expect(page.getByText("ローシーズン")).toBeVisible();
    await expect(page.getByText("ミドルシーズン")).toBeVisible();
    await expect(page.getByText("ハイシーズン")).toBeVisible();
  });

  test("空室カレンダーが表示される", async ({ page }) => {
    // AvailabilityCalendar の凡例テキスト
    await expect(page.getByText("空室あり")).toBeVisible();
  });

  test("問い合わせボタンが存在する", async ({ page }) => {
    await expect(page.getByRole("link", { name: "この条件で問い合わせる" })).toBeVisible();
  });

  test("予約リクエストボタンが存在する", async ({ page }) => {
    await expect(page.getByRole("link", { name: "予約リクエストを送る" })).toBeVisible();
  });
});

test("/facility/nonexistent にアクセスすると404が表示される", async ({ page }) => {
  await page.goto("/facility/nonexistent");
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("お探しの施設が見つかりませんでした")).toBeVisible();
});
