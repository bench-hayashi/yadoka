import { test, expect } from "@playwright/test";
import { loginAsOwner } from "./helpers/auth";

test.describe("オーナーダッシュボード", () => {
  test("未ログインで /owner にアクセスするとリダイレクトされる", async ({ page }) => {
    await page.goto("/owner");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/login/);
  });

  test.describe("ログイン後", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
    });

    test("テストオーナーでログイン後 /owner にアクセスできる", async ({ page }) => {
      await page.goto("/owner");
      // 認証チェック完了後にコンテンツが表示されるのを待つ
      await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible({
        timeout: 20000,
      });
      await expect(page).toHaveURL("/owner");
    });

    test("ダッシュボードにステータスサマリーカードが表示される（公開中・審査中・下書き）", async ({ page }) => {
      await page.goto("/owner");
      await page.waitForSelector("text=公開中", { timeout: 20000 });

      await expect(page.getByText("公開中").first()).toBeVisible();
      await expect(page.getByText("審査中").first()).toBeVisible();
      await expect(page.getByText("下書き").first()).toBeVisible();
    });

    test("サイドバーのナビゲーションメニューが表示される", async ({ page }) => {
      await page.goto("/owner");
      // ダッシュボードが表示されるまで待ってからサイドバーを確認
      await page.waitForSelector("text=ダッシュボード", { timeout: 20000 });

      // デスクトップサイドバー（md以上で表示）
      const sidebar = page.locator("aside").first();
      await expect(sidebar.getByRole("link", { name: "ダッシュボード" })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: "施設管理" })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: "問い合わせ" })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: "予約リクエスト" })).toBeVisible();
    });
  });
});
