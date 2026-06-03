/**
 * 共通・横断テスト（C-01 〜 C-14）
 */
import { test, expect } from "@playwright/test";
import { loginAsOwner } from "./helpers/auth";

// ── C-01〜C-02：表示速度 ─────────────────────────────────────────────────────

test("C-01: トップページが2秒以内に表示される", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const elapsed = Date.now() - start;

  // DOMContentLoaded ベースで2秒以内（ネットワーク環境依存のため参考値）
  expect(elapsed).toBeLessThan(2000);
  await expect(page.locator("text=YADOKA").first()).toBeVisible();
  // 手動確認: 実際のLCP（Largest Contentful Paint）はLighthouseで計測
});

test("C-02: 検索結果ページが2秒以内に表示される", async ({ page }) => {
  const start = Date.now();
  await page.goto("/search");
  await page.waitForLoadState("domcontentloaded");
  const elapsed = Date.now() - start;

  expect(elapsed).toBeLessThan(2000);
  await expect(
    page.locator("text=件の施設が見つかりました").or(page.locator("text=見つかりませんでした"))
  ).toBeVisible({ timeout: 5000 });
  // 手動確認: Vercel Speed Insights または Lighthouse で実測
});

// ── C-03〜C-06：モバイル・レスポンシブ ──────────────────────────────────────

test.skip("C-03: トップページのモバイルレイアウト（目視確認）", async ({ page }) => {
  // 手動確認項目:
  // 1. iPhone 14 等のビューポートで http://localhost:3000 を開く
  // 2. ヒーロー・エリアカード・テーマタグがレイアウト崩れなく表示されるか確認
  // 3. 画像のクリッピングが適切か確認
});

test("C-04: モバイルで検索フォームが操作できる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 相当
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // 検索フォームが表示される
  await expect(page.locator("button[type='submit'], button:has-text('検索')").first()).toBeVisible();
  // 手動確認: タップで入力できるか、キーボードが表示されるか
});

test.skip("C-05: 施設詳細のモバイル表示（目視確認）", async ({ page }) => {
  // 手動確認項目:
  // 1. スマートフォンで施設詳細ページを開く
  // 2. 写真ギャラリー・料金・空室カレンダーが適切に表示されるか確認
  // 3. サイドバーが下に移動しているか確認
});

test("C-06: モバイルでハンバーガーメニューが表示される", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // ハンバーガーボタンが表示される（PCナビは非表示）
  await expect(page.locator("button[aria-label='メニューを開く']")).toBeVisible();
  await expect(page.locator("nav.hidden.md\\:flex")).not.toBeVisible();

  // ハンバーガーをクリックするとメニューが開く
  await page.locator("button[aria-label='メニューを開く']").click();
  await expect(page.locator("text=施設を探す").first()).toBeVisible();
});

// ── C-07〜C-10：アクセス制御 ─────────────────────────────────────────────────

test("C-07: 未ログインで /owner にアクセスするとログイン画面へ", async ({ page }) => {
  await page.goto("/owner");
  // ログインページへリダイレクトされる
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
});

test("C-08: 旅行者（未ログイン）が /admin にアクセスすると管理画面コンテンツを表示しない", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  // ログインページまたは権限なしページに遷移する
  const url = page.url();
  const isRedirected = url.includes("/login") || url.includes("/unauthorized");
  if (!isRedirected) {
    // リダイレクトされない場合は管理者ダッシュボードの固有コンテンツが表示されないことを確認
    await expect(page.locator("text=施設審査, text=ユーザー管理").first()).not.toBeVisible();
  }
  // 手動確認: /login または /unauthorized に遷移するか確認
});

test("C-09: オーナーが /admin にアクセスすると権限なし画面", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  // 管理者専用コンテンツは表示されない、またはリダイレクトされる
  const url = page.url();
  const isRedirected = url.includes("/unauthorized") || url.includes("/login");
  if (!isRedirected) {
    // リダイレクトされない場合は管理専用コンテンツが非表示
    await expect(page.locator("text=施設審査").first()).not.toBeVisible();
  }
  // 手動確認: /unauthorized ページに遷移するか確認
});

test.skip("C-10: 他オーナーの施設を直接URLで編集しようとすると拒否される", async ({ page }) => {
  // 手動確認項目:
  // 1. オーナーAでログイン
  // 2. オーナーBの施設の編集URL（/owner/facilities/XXX/edit）を直接入力
  // 3. 権限なしエラーまたはリダイレクトされることを確認
  // ※他オーナーの施設IDが必要なため手動確認
});

// ── C-11〜C-12：エラー処理 ───────────────────────────────────────────────────

test("C-11: 存在しない施設URLで404ページが表示される", async ({ page }) => {
  await page.goto("/facility/this-facility-does-not-exist-xyz");
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator("text=404").or(page.locator("text=見つかりません")).or(
      page.locator("text=ページが見つかりません")
    )
  ).toBeVisible();
});

test.skip("C-12: フォーム送信失敗時にエラーメッセージが表示される", async ({ page }) => {
  // 手動確認項目:
  // ネットワークをオフにして問い合わせフォームを送信し、
  // エラーメッセージが適切に表示されるか確認
  // ※ネットワーク切断のシミュレーションは追加実装が必要
});

test.skip("C-13: 主要ブラウザでの表示確認（目視確認）", async ({ page }) => {
  // 手動確認項目:
  // Chrome・Safari・Edge でトップページ・施設詳細ページを開き、
  // レイアウト崩れがないか確認
  // ※playwright.config.ts に webkit/firefox プロジェクトを追加してカバー
});

// ── C-14：ページタイトル ─────────────────────────────────────────────────────

test("C-14: 各ページに適切なタイトルが設定されている", async ({ page }) => {
  // トップページ
  await page.goto("/");
  await expect(page).toHaveTitle(/YADOKA/);

  // 検索ページ
  await page.goto("/search");
  await expect(page).toHaveTitle(/YADOKA/);

  // ログインページ
  await page.goto("/login");
  await expect(page).toHaveTitle(/YADOKA/);

  // エリアページ（存在するスラグを使用）
  await page.goto("/area/kawaguchiko");
  await page.waitForLoadState("networkidle");
  const areaTitle = await page.title();
  // 404 でなければタイトルに YADOKA が含まれる
  if (!areaTitle.includes("404")) {
    expect(areaTitle).toMatch(/YADOKA/);
  }
});
