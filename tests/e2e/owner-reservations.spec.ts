import { test, expect } from "@playwright/test";
import { loginAsOwner } from "./helpers/auth";

test.describe("予約リクエスト管理", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("テストオーナーでログイン後 /owner/reservations にアクセスできる", async ({ page }) => {
    await page.goto("/owner/reservations");
    await expect(page.getByRole("heading", { name: "予約リクエスト一覧" })).toBeVisible({
      timeout: 20000,
    });
  });

  test("ステータスフィルタが表示される（全件・確認待ち・承認済・拒否）", async ({ page }) => {
    await page.goto("/owner/reservations");
    await page.waitForSelector("text=予約リクエスト一覧", { timeout: 20000 });

    await expect(page.getByRole("button", { name: "全件" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "確認待ち" })).toBeVisible();
    await expect(page.getByRole("button", { name: "承認済" })).toBeVisible();
    await expect(page.getByRole("button", { name: "拒否" })).toBeVisible();
  });

  test("予約リクエスト一覧がテーブルまたは「まだありません」のメッセージで表示される", async ({ page }) => {
    await page.goto("/owner/reservations");
    await page.waitForSelector("text=予約リクエスト一覧", { timeout: 20000 });

    // データあり: テーブルが表示される / なし: 空メッセージが表示される
    const table = page.locator("table");
    const empty = page.getByText("予約リクエストはまだありません");
    await expect(table.or(empty)).toBeVisible({ timeout: 15000 });
  });
});
