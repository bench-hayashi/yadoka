import { test, expect } from "@playwright/test";

test.describe("認証", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
  });

  test("/login ページが表示される", async ({ page }) => {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("ログインタブと新規登録タブが切り替えられる", async ({ page }) => {
    // 初期状態はログインタブ
    await expect(page.getByRole("button", { name: "ログイン", exact: true }).first()).toBeVisible();

    // 新規登録タブへ切り替え
    await page.getByRole("button", { name: "新規登録" }).click();
    await expect(page.locator("#displayName")).toBeVisible();

    // ログインタブに戻す
    await page.getByRole("button", { name: "ログイン", exact: true }).first().click();
    await expect(page.locator("#displayName")).not.toBeVisible();
  });

  test("不正な情報でログインするとエラーメッセージが表示される", async ({ page }) => {
    await page.locator("#email").fill("notexist@yadoka.dev");
    await page.locator("#password").fill("wrongpassword");

    await page.locator('form button[type="submit"]').click();

    await expect(page.locator("p.text-red-600, p.text-sm.text-red-600")).toBeVisible({
      timeout: 10000,
    });
  });
});
