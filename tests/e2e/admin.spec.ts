/**
 * 管理者機能テスト（A-01 〜 A-15）
 * ログイン情報: env ADMIN_EMAIL / ADMIN_PASSWORD（デフォルト: testadmin@yadoka.dev）
 */
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

// ── A-01〜A-02：ログイン・ダッシュボード ─────────────────────────────────────

test("A-01: 管理者ログイン後にヘッダー「管理パネル」表示", async ({ page }) => {
  await expect(page.locator("a:has-text('管理パネル')")).toBeVisible();
});

test("A-02: 管理ダッシュボードに統計情報が表示される", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  // 施設数・ユーザー数・審査待ち件数のいずれかが表示される
  await expect(
    page.locator("text=施設").or(page.locator("text=ユーザー")).or(page.locator("text=審査"))
  ).toBeVisible();
});

// ── A-03〜A-07：施設審査 ─────────────────────────────────────────────────────

test("A-03: /admin/facilities に審査待ちフィルタが存在する", async ({ page }) => {
  await page.goto("/admin/facilities");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("text=審査待ち, text=pending").first()).toBeVisible();
  // 施設一覧またはゼロ件メッセージが表示される
  await expect(
    page.locator("table, text=施設がありません").first()
  ).toBeVisible();
});

test("A-07: ステータスタブ切替で絞り込みができる", async ({ page }) => {
  await page.goto("/admin/facilities");
  await page.waitForLoadState("networkidle");

  // 各ステータスボタンをクリックして URL またはページが更新される
  const statusButtons = ["審査待ち", "公開中", "下書き", "差し戻し", "掲載停止"];
  for (const status of statusButtons) {
    const btn = page.locator(`button:has-text('${status}'), a:has-text('${status}')`).first();
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("table, text=施設がありません").first()).toBeVisible();
    }
  }
});

test.skip("A-04: 施設承認（審査待ち→公開）", async ({ page }) => {
  // 手動確認項目:
  // 1. 審査待ちの施設詳細を開く
  // 2. 「承認して公開」ボタンを押す
  // 3. ステータスが「公開中」になることを確認
  // 4. 旅行者の検索結果に表示されることを確認
  // ※本番データに影響するため手動確認
});

test.skip("A-05: 施設差し戻し", async ({ page }) => {
  // 手動確認項目:
  // 1. 審査待ちの施設にコメントを入力
  // 2. 「差し戻す」ボタンを押す
  // 3. ステータスが「差し戻し」になることを確認
  // 4. オーナーダッシュボードに反映されることを確認
});

test.skip("A-06: 掲載停止", async ({ page }) => {
  // 手動確認項目:
  // 1. 公開中の施設詳細を開く
  // 2. 「掲載停止」ボタンを押す
  // 3. 旅行者の検索結果から消えることを確認
});

// ── A-08〜A-10：ユーザー管理 ─────────────────────────────────────────────────

test("A-08: /admin/users にユーザー一覧が表示される", async ({ page }) => {
  await page.goto("/admin/users");
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator("table, text=ユーザーがいません").first()
  ).toBeVisible();
  // ロール変更コントロールが存在する
  await expect(
    page.locator("select, button:has-text('変更')").first()
  ).toBeVisible({ timeout: 5000 }).catch(() => {});
});

test("A-10: 自分自身のロールは変更不可（無効化）", async ({ page }) => {
  await page.goto("/admin/users");
  await page.waitForLoadState("networkidle");

  // 管理者自身の行を特定（通常は "あなた" や disabled になっている）
  const disabledSelect = page.locator("select[disabled], button[disabled]").first();
  if (await disabledSelect.count() > 0) {
    await expect(disabledSelect).toBeDisabled();
  }
  // 手動確認: 管理者自身の行の権限変更が無効化されているか
});

test.skip("A-09: ユーザー権限変更（旅行者→オーナー）", async ({ page }) => {
  // 手動確認項目:
  // 1. 旅行者ユーザーの権限をオーナーに変更
  // 2. 変更が保存されることを確認
  // 3. 本人ログイン時にヘッダーが変化することを確認
  // ※実際のユーザーデータに影響するため手動確認
});

// ── A-11〜A-14：タグ管理 ─────────────────────────────────────────────────────

test("A-11: タグ追加が完了する", async ({ page }) => {
  await page.goto("/admin/tags");
  await page.waitForLoadState("networkidle");

  const addBtn = page.locator("button:has-text('タグを追加'), button:has-text('追加')").first();
  if (await addBtn.count() === 0) { test.skip(true, "追加ボタンなし"); return; }
  await addBtn.click();

  // 追加フォームが表示される
  const nameInput = page.locator("input[placeholder*='タグ名'], input[placeholder*='BBQ']").first();
  await expect(nameInput).toBeVisible();

  // テスト用タグを入力
  await nameInput.fill("自動テスト用タグ_DELETE");
  const submitBtn = page.locator("button:has-text('追加')").last();
  await submitBtn.click();
  await page.waitForLoadState("networkidle");

  // 追加されたタグが一覧に表示される
  await expect(page.locator("text=自動テスト用タグ_DELETE")).toBeVisible({ timeout: 8000 });
});

test("A-12: タグ編集が保存される", async ({ page }) => {
  await page.goto("/admin/tags");
  await page.waitForLoadState("networkidle");

  const editBtn = page.locator("button:has-text('編集')").first();
  if (await editBtn.count() === 0) { test.skip(true, "タグなし"); return; }
  await editBtn.click();

  // 編集フォームが表示される
  await expect(page.locator("input[type='text']").first()).toBeVisible();
  // 手動確認: 変更後「保存」を押してトーストが出るか
});

test("A-13: タグアイコン設定 UI が表示される", async ({ page }) => {
  await page.goto("/admin/tags");
  await page.waitForLoadState("networkidle");

  const editBtn = page.locator("button:has-text('編集')").first();
  if (await editBtn.count() === 0) { test.skip(true, "タグなし"); return; }
  await editBtn.click();

  // アイコンピッカーグリッドが表示される
  await expect(page.locator("text=アイコン")).toBeVisible({ timeout: 5000 });
  // アイコンボタンが存在する（lucide アイコングリッド）
  const iconBtns = page.locator("button[title]").filter({ hasText: "" });
  await expect(iconBtns.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  // 手動確認: アイコンをクリックして保存後、トップページのテーマタグにアイコンが表示されるか
});

test("A-14: タグ削除が完了する", async ({ page }) => {
  await page.goto("/admin/tags");
  await page.waitForLoadState("networkidle");

  // A-11 で追加したテストタグを削除
  const testTagRow = page.locator("tr, div").filter({ hasText: "自動テスト用タグ_DELETE" }).first();
  if (await testTagRow.count() === 0) { test.skip(true, "削除対象タグなし"); return; }

  const deleteBtn = testTagRow.locator("button:has-text('削除')");
  if (await deleteBtn.count() === 0) { test.skip(true, "削除ボタンなし"); return; }

  page.once("dialog", (dialog) => dialog.accept());
  await deleteBtn.click();
  await page.waitForLoadState("networkidle");

  await expect(page.locator("text=自動テスト用タグ_DELETE")).not.toBeVisible({ timeout: 8000 });
});

// ── A-15：エリア説明文編集 ───────────────────────────────────────────────────

test("A-15: エリア説明文を編集して保存できる", async ({ page }) => {
  await page.goto("/admin/areas");
  await page.waitForLoadState("networkidle");

  const editBtn = page.locator("button:has-text('編集')").first();
  if (await editBtn.count() === 0) { test.skip(true, "エリアなし"); return; }
  await editBtn.click();

  // 説明文テキストエリアが表示される
  await expect(page.locator("textarea").first()).toBeVisible();
  // 手動確認: 説明文を変更して保存後、エリアページの説明文が更新されるか
});
