import { test, expect } from "@playwright/test";

test.describe("デザイン", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("トップページのヒーローセクションに「一棟貸し」を含むキャッチコピーが表示される", async ({ page }) => {
    const hero = page.locator("section").first();
    await expect(hero.getByText(/一棟貸し/)).toBeVisible();
  });

  test("ヒーローセクション内に検索フォームが存在する", async ({ page }) => {
    const hero = page.locator("section").first();
    await expect(hero.locator("form")).toBeVisible();
    await expect(hero.locator('select').first()).toBeVisible();
    await expect(hero.locator('input[type="date"]').first()).toBeVisible();
    await expect(hero.getByRole("button", { name: "この条件で検索する" })).toBeVisible();
  });

  test("フッターが表示される", async ({ page }) => {
    await expect(page.locator("footer")).toBeVisible();
  });

  test("ヘッダーにYADOKAの文字が含まれる", async ({ page }) => {
    await expect(page.locator("header", { hasText: "YADOKA" })).toBeVisible();
  });
});
