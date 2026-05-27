import type { Page } from "@playwright/test";

const OWNER_EMAIL = "testowner@yadoka.dev";
const OWNER_PASSWORD = "testpass1234";

export async function loginAsOwner(page: Page): Promise<void> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.locator("#email").fill(OWNER_EMAIL);
  await page.locator("#password").fill(OWNER_PASSWORD);
  // タブボタン（type="button"）ではなく送信ボタン（type="submit"）を対象にする
  await page.locator('form button[type="submit"]').click();

  // ログイン成功後は "/" にリダイレクトされる。URL 変化を待つことで
  // Supabase の認証完了前に次の処理へ進む競合を防ぐ
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}
