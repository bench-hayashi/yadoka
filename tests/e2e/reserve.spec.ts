import { test, expect } from "@playwright/test";

const RESERVE_URL =
  "/facility/fuji-view-villa-kawaguchiko/reserve?checkin=2026-06-01&checkout=2026-06-03&guests=2";

test.describe("予約リクエストフォーム", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(RESERVE_URL);
    // Suspense + クライアントサイドフェッチを待つ
    await page.waitForSelector("#guestName", { timeout: 15000 });
  });

  test("フォームが表示される", async ({ page }) => {
    await expect(page.locator("#guestName")).toBeVisible();
    await expect(page.locator("#guestEmail")).toBeVisible();
    await expect(page.locator("#guestPhone")).toBeVisible();
    await expect(page.locator("#checkinDate")).toBeVisible();
    await expect(page.locator("#checkoutDate")).toBeVisible();
    await expect(page.locator("#guestCount")).toBeVisible();
    await expect(page.locator("#message")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "予約リクエストを送信する" })
    ).toBeVisible();
  });

  test("日付を入力すると料金が自動表示される", async ({ page }) => {
    // URLパラメータで日付は設定済み。計算中 → 料金表示 を待つ
    await expect(page.getByText("計算中")).toBeVisible({ timeout: 5000 }).catch(() => {
      // 計算がすでに完了している場合はスキップ
    });

    // ¥ を含む料金テキストが現れるのを待つ
    await expect(page.getByText(/¥[\d,]+/)).toBeVisible({ timeout: 15000 });
  });

  test("必須項目を入力して送信すると完了メッセージが表示される", async ({ page }) => {
    // URLパラメータから日付・人数はすでに設定されている
    await page.locator("#guestName").fill("テストユーザー");
    await page.locator("#guestEmail").fill("test@example.com");

    // 空室確認が完了するまで待機（計算中が消えるのを待つ）
    await page.waitForFunction(
      () => !document.body.innerText.includes("計算中"),
      { timeout: 15000 }
    );

    await page.getByRole("button", { name: "予約リクエストを送信する" }).click();

    await expect(
      page.getByText("予約リクエストを送信しました。")
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByText("施設オーナーが確認後、ご連絡いたします。")
    ).toBeVisible();

    // 施設詳細ページに戻るリンクが表示される
    await expect(page.getByRole("link", { name: /施設詳細ページに戻る/ })).toBeVisible();
  });
});
