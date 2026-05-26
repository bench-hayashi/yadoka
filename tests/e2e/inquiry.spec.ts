import { test, expect } from "@playwright/test";

const INQUIRY_URL = "/facility/fuji-view-villa-kawaguchiko/inquiry";

test.describe("問い合わせフォーム", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(INQUIRY_URL);
    // Suspense + クライアントサイドフェッチを待つ
    await page.waitForSelector("#guestName", { timeout: 15000 });
  });

  test("フォームが表示される（名前・メール・メッセージ等の入力欄）", async ({ page }) => {
    await expect(page.locator("#guestName")).toBeVisible();
    await expect(page.locator("#guestEmail")).toBeVisible();
    await expect(page.locator("#guestPhone")).toBeVisible();
    await expect(page.locator("#guestCount")).toBeVisible();
    await expect(page.locator("#checkinDate")).toBeVisible();
    await expect(page.locator("#checkoutDate")).toBeVisible();
    await expect(page.locator("#message")).toBeVisible();
    await expect(page.getByRole("button", { name: "問い合わせを送信する" })).toBeVisible();
  });

  test("必須項目を空のまま送信するとバリデーションエラーが表示される", async ({ page }) => {
    await page.getByRole("button", { name: "問い合わせを送信する" }).click();

    await expect(page.getByText("お名前を入力してください")).toBeVisible();
    await expect(page.getByText("メールアドレスを入力してください")).toBeVisible();
    await expect(page.getByText("お問い合わせ内容を入力してください")).toBeVisible();
  });

  test("無効なメールアドレスを入力するとバリデーションエラーが表示される", async ({ page }) => {
    await page.locator("#guestName").fill("テストユーザー");
    await page.locator("#guestEmail").fill("invalid-email");
    await page.locator("#message").fill("テスト問い合わせです");

    await page.getByRole("button", { name: "問い合わせを送信する" }).click();

    await expect(page.getByText("メールアドレスの形式が正しくありません")).toBeVisible();
  });

  test("必須項目を入力して送信すると完了メッセージが表示される", async ({ page }) => {
    await page.locator("#guestName").fill("テストユーザー");
    await page.locator("#guestEmail").fill("test@example.com");
    await page.locator("#message").fill("テスト問い合わせです");

    await page.getByRole("button", { name: "問い合わせを送信する" }).click();

    await expect(
      page.getByText("お問い合わせを受け付けました。")
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByText("施設オーナーからの返信をお待ちください。")
    ).toBeVisible();

    // 施設詳細ページに戻るリンクが表示される
    await expect(page.getByRole("link", { name: /施設詳細ページに戻る/ })).toBeVisible();
  });
});
