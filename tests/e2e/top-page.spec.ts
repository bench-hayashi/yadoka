import { test, expect } from "@playwright/test";

test.describe("トップページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("ページタイトルにYADOKAが含まれる", async ({ page }) => {
    await expect(page).toHaveTitle(/YADOKA/);
  });

  test("ヘッダーにYADOKAロゴが表示される", async ({ page }) => {
    const logo = page.locator("header a", { hasText: "YADOKA" });
    await expect(logo).toBeVisible();
  });

  test("検索フォームが存在する（エリア選択・日付・人数・検索ボタン）", async ({ page }) => {
    await expect(page.locator("select").first()).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="number"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "この条件で検索する" })).toBeVisible();
  });

  test("エリア一覧セクションに河口湖・軽井沢・那須が表示される", async ({ page }) => {
    await expect(page.getByText("河口湖", { exact: true })).toBeVisible();
    await expect(page.getByText("軽井沢", { exact: true })).toBeVisible();
    await expect(page.getByText("那須", { exact: true })).toBeVisible();
  });

  test("テーマセクションにペット可・大人数向けが表示される", async ({ page }) => {
    await expect(page.getByText("ペット可", { exact: true })).toBeVisible();
    await expect(page.getByText("大人数向け", { exact: true })).toBeVisible();
  });

  test("フッターが表示される", async ({ page }) => {
    await expect(page.locator("footer")).toBeVisible();
  });
});
