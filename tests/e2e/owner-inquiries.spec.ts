import { test, expect } from "@playwright/test";
import { loginAsOwner } from "./helpers/auth";

test.describe("問い合わせ管理", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("テストオーナーでログイン後 /owner/inquiries にアクセスできる", async ({ page }) => {
    await page.goto("/owner/inquiries");
    await expect(page.getByRole("heading", { name: "問い合わせ一覧" })).toBeVisible({
      timeout: 20000,
    });
  });

  test("ステータスフィルタが表示される（全件・未読・返信済・完了）", async ({ page }) => {
    await page.goto("/owner/inquiries");
    await page.waitForSelector("text=問い合わせ一覧", { timeout: 20000 });

    await expect(page.getByRole("button", { name: "全件" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "未読" })).toBeVisible();
    await expect(page.getByRole("button", { name: "返信済" })).toBeVisible();
    await expect(page.getByRole("button", { name: "完了" })).toBeVisible();
  });

  test("問い合わせ一覧がテーブルまたは「まだありません」のメッセージで表示される", async ({ page }) => {
    await page.goto("/owner/inquiries");
    await page.waitForSelector("text=問い合わせ一覧", { timeout: 20000 });

    // データあり: テーブルが表示される / なし: 空メッセージが表示される
    const table = page.locator("table");
    const empty = page.getByText("問い合わせはまだありません");
    await expect(table.or(empty)).toBeVisible({ timeout: 15000 });
  });
});
