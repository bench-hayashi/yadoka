import { test, expect } from "@playwright/test";
import { loginAsOwner } from "./helpers/auth";

test.describe("施設管理", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("/owner/facilities で施設一覧が表示される", async ({ page }) => {
    await page.goto("/owner/facilities");
    await expect(page.getByRole("heading", { name: "施設管理" })).toBeVisible({
      timeout: 20000,
    });
  });

  test("「新しい施設を登録」ボタンが存在する", async ({ page }) => {
    await page.goto("/owner/facilities");
    // ページ表示を待ってからボタンを確認
    await page.waitForSelector("text=施設管理", { timeout: 20000 });
    // ヘッダーのリンクボタン（施設0件の場合は本文にも表示される）
    await expect(
      page.getByRole("link", { name: /新しい施設を登録/ }).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("/owner/facilities/new で登録ウィザードが表示される", async ({ page }) => {
    await page.goto("/owner/facilities/new");
    await expect(page.getByRole("heading", { name: "施設を登録する" })).toBeVisible({
      timeout: 20000,
    });
  });

  test("Step 1 の基本情報フォームが表示される（施設名・エリア・住所・説明文）", async ({ page }) => {
    await page.goto("/owner/facilities/new");
    await page.waitForSelector("text=基本情報", { timeout: 20000 });

    // フォームフィールド
    await expect(page.getByLabel(/施設名/)).toBeVisible();
    await expect(page.getByLabel(/エリア/)).toBeVisible();
    await expect(page.getByLabel(/住所/)).toBeVisible();
    await expect(page.getByLabel(/説明文/)).toBeVisible();
  });

  test("施設編集ページに4つのタブが表示される（基本情報・写真管理・料金設定・空室管理）", async ({ page }) => {
    // テストオーナーの施設一覧から最初の施設IDを取得
    await page.goto("/owner/facilities");
    await page.waitForLoadState("networkidle");

    const editLink = page.getByRole("link", { name: "編集" }).first();
    const count = await editLink.count();

    if (count === 0) {
      // 施設が登録されていない場合はスキップ
      test.skip();
      return;
    }

    await editLink.click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: "基本情報" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "写真管理" })).toBeVisible();
    await expect(page.getByRole("button", { name: "料金設定" })).toBeVisible();
    await expect(page.getByRole("button", { name: "空室管理" })).toBeVisible();
  });
});
