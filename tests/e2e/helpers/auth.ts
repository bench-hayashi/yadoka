import type { Page } from "@playwright/test";

// ── 旅行者（テスト用アカウント） ───────────────────────────────────────────────
const USER_EMAIL    = process.env.TEST_USER_EMAIL    ?? "guest@example.com";
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? "guest1234";

// ── オーナー ──────────────────────────────────────────────────────────────────
const OWNER_EMAIL    = "owner@example.com";
const OWNER_PASSWORD = "owner1234";

// ── 管理者 ────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

// ── 共通ログイン処理 ──────────────────────────────────────────────────────────

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

export async function loginAsUser(page: Page): Promise<void> {
  await login(page, USER_EMAIL, USER_PASSWORD);
}

export async function loginAsOwner(page: Page): Promise<void> {
  await login(page, OWNER_EMAIL, OWNER_PASSWORD);
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}
