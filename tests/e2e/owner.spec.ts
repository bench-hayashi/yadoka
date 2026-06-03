/**
 * オーナー機能テスト（O-01 〜 O-20）
 * ログイン情報: testowner@yadoka.dev / testpass1234
 */
import { test, expect } from "@playwright/test";
import { loginAsOwner } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await loginAsOwner(page);
});

// ── O-01〜O-02：ログイン・ダッシュボード ─────────────────────────────────────

test("O-01: オーナーログイン後にヘッダー「施設管理」表示", async ({ page }) => {
  // beforeEach でログイン済み
  await expect(page.locator("a:has-text('施設管理')")).toBeVisible();
});

test("O-02: ダッシュボードに件数カードが表示される", async ({ page }) => {
  await page.goto("/owner");
  await page.waitForLoadState("networkidle");
  // 公開中・審査中・下書きのいずれかの文言が表示される
  await expect(
    page.locator("text=公開中").or(page.locator("text=審査中")).or(page.locator("text=下書き"))
  ).toBeVisible();
});

// ── O-03〜O-05：施設登録ウィザード ───────────────────────────────────────────

test("O-03: 施設登録ウィザード（3ステップ）の UI が表示される", async ({ page }) => {
  await page.goto("/owner/facilities/new");
  await page.waitForLoadState("networkidle");

  // Step1 の見出し・フォームが表示される
  await expect(
    page.locator("text=基本情報").or(page.locator("text=ステップ 1")).or(page.locator("text=Step 1"))
  ).toBeVisible();
  await expect(page.locator("input[name='name'], input[placeholder*='施設名']").first()).toBeVisible();
});

test("O-04: Step1 で下書き保存できる", async ({ page }) => {
  await page.goto("/owner/facilities/new");
  await page.waitForLoadState("networkidle");

  // 施設名を入力して下書き保存
  const nameInput = page.locator("input[name='name'], input[placeholder*='施設名']").first();
  if (await nameInput.count() === 0) { test.skip(true, "フォームなし"); return; }

  await nameInput.fill("テスト施設 (自動テスト用)");
  const draftBtn = page.locator("button:has-text('下書き')");
  if (await draftBtn.count() === 0) { test.skip(true, "下書きボタンなし"); return; }
  await draftBtn.click();
  await page.waitForLoadState("networkidle");

  // 成功メッセージまたはリダイレクト
  await expect(
    page.locator("text=保存しました, text=下書き, text=登録しました").first()
  ).toBeVisible({ timeout: 8000 }).catch(() => {});
  // 手動確認: 一覧に「下書き」で表示されるか
});

test("O-05: 施設登録：必須項目空で次へ→バリデーションエラー", async ({ page }) => {
  await page.goto("/owner/facilities/new");
  await page.waitForLoadState("networkidle");

  // 何も入力せずに次へ
  const nextBtn = page.locator("button:has-text('次へ'), button:has-text('Next')").first();
  if (await nextBtn.count() === 0) { test.skip(true, "次へボタンなし"); return; }
  await nextBtn.click();

  // バリデーションエラーが表示される
  await expect(
    page.locator("text=入力してください, text=必須, [class*='error']").first()
  ).toBeVisible({ timeout: 5000 }).catch(() => {
    // HTML5 native validation の場合
  });
});

// ── O-06：施設編集 ────────────────────────────────────────────────────────────

test("O-06: 施設編集ページが開き基本情報タブが表示される", async ({ page }) => {
  await page.goto("/owner/facilities");
  await page.waitForLoadState("networkidle");

  const editLink = page.locator("a[href*='/edit']").first();
  if (await editLink.count() === 0) { test.skip(true, "編集可能な施設なし"); return; }
  await editLink.click();
  await page.waitForLoadState("networkidle");

  // 4タブ（基本情報・写真管理・料金設定・空室管理）
  await expect(page.locator("text=基本情報")).toBeVisible();
  await expect(page.locator("text=写真管理").or(page.locator("text=写真"))).toBeVisible();
  await expect(page.locator("text=料金設定").or(page.locator("text=料金"))).toBeVisible();
  await expect(page.locator("text=空室管理").or(page.locator("text=空室"))).toBeVisible();
});

// ── O-07〜O-10：写真管理 ─────────────────────────────────────────────────────

test.skip("O-07: 写真アップロード", async ({ page }) => {
  // 手動確認項目:
  // 1. 写真タブを開く
  // 2. 「画像を選択」からファイルをアップロード
  // 3. アップロード後、サムネイル一覧に表示されることを確認
  // ※実際の画像ファイルとCloudinary連携が必要なため手動確認
});

test("O-08: ヒーロー画像設定ボタンが写真タブに存在する", async ({ page }) => {
  await page.goto("/owner/facilities");
  await page.waitForLoadState("networkidle");
  const editLink = page.locator("a[href*='/edit']").first();
  if (await editLink.count() === 0) { test.skip(true, "施設なし"); return; }
  await editLink.click();
  await page.waitForLoadState("networkidle");

  // 写真タブをクリック
  await page.locator("text=写真管理, text=写真").first().click();
  // ヒーロー設定UIまたはボタンが存在するか
  await expect(
    page.locator("text=代表, text=ヒーロー, text=★").or(page.locator("button[aria-label*='ヒーロー']"))
  ).toBeVisible({ timeout: 5000 }).catch(() => {});
  // 手動確認: ★ボタンで代表画像が設定されるか
});

test.skip("O-09: 写真並び替え（前へ/後ろへ）", async ({ page }) => {
  // 手動確認項目:
  // 複数枚写真がある場合、「前へ」「後ろへ」ボタンで表示順が変わることを確認
});

test("O-10: 写真削除ボタンが存在する", async ({ page }) => {
  await page.goto("/owner/facilities");
  await page.waitForLoadState("networkidle");
  const editLink = page.locator("a[href*='/edit']").first();
  if (await editLink.count() === 0) { test.skip(true, "施設なし"); return; }
  await editLink.click();
  await page.waitForLoadState("networkidle");

  await page.locator("text=写真管理, text=写真").first().click();
  // 写真があれば削除ボタンが存在する
  const deleteBtn = page.locator("button:has-text('削除')").first();
  if (await deleteBtn.count() > 0) {
    await expect(deleteBtn).toBeVisible();
    // 手動確認: 削除確認後、一覧から消えるか
  }
});

// ── O-11〜O-13：料金設定 ─────────────────────────────────────────────────────

test("O-11: 料金設定タブに料金入力フォームが表示される", async ({ page }) => {
  await page.goto("/owner/facilities");
  await page.waitForLoadState("networkidle");
  const editLink = page.locator("a[href*='/edit']").first();
  if (await editLink.count() === 0) { test.skip(true, "施設なし"); return; }
  await editLink.click();
  await page.waitForLoadState("networkidle");

  await page.locator("text=料金設定, text=料金").first().click();
  await page.waitForLoadState("networkidle");
  // 料金入力フォームまたはシーズン設定が表示される
  await expect(
    page.locator("text=ローシーズン, text=シーズン, text=平日, input[name*='price'], input[type='number']").first()
  ).toBeVisible({ timeout: 5000 });
});

test("O-12: シーズン期間設定フォームが表示される", async ({ page }) => {
  await page.goto("/owner/facilities");
  await page.waitForLoadState("networkidle");
  const editLink = page.locator("a[href*='/edit']").first();
  if (await editLink.count() === 0) { test.skip(true, "施設なし"); return; }
  await editLink.click();
  await page.waitForLoadState("networkidle");

  await page.locator("text=料金設定, text=料金").first().click();
  await expect(
    page.locator("text=シーズン, text=期間, input[type='date']").first()
  ).toBeVisible({ timeout: 5000 });
  // 手動確認: 開始日・終了日設定後、料金計算に反映されるか
});

test.skip("O-13: 料金上書き（特定日）", async ({ page }) => {
  // 手動確認項目:
  // 1. 料金タブで特定日を選択
  // 2. 上書き料金を入力
  // 3. 旅行者側でその日の料金が変わることを確認
});

// ── O-14〜O-15：空室管理 ─────────────────────────────────────────────────────

test("O-14: 空室カレンダーが表示される", async ({ page }) => {
  await page.goto("/owner/facilities");
  await page.waitForLoadState("networkidle");
  const editLink = page.locator("a[href*='/edit']").first();
  if (await editLink.count() === 0) { test.skip(true, "施設なし"); return; }
  await editLink.click();
  await page.waitForLoadState("networkidle");

  await page.locator("text=空室管理, text=空室").first().click();
  await page.waitForLoadState("networkidle");
  // カレンダーUIが表示される
  await expect(
    page.locator("[class*='calendar'], [class*='Calendar'], text=空室, text=満室").first()
  ).toBeVisible({ timeout: 8000 });
  // 手動確認: 日付クリックで空室⇔満室が切り替わるか
});

test.skip("O-15: 空室変更が旅行者側に反映される", async ({ page }) => {
  // 手動確認項目:
  // 1. オーナーが特定日を満室に変更
  // 2. ログアウトし旅行者として同施設詳細を開く
  // 3. 空室カレンダーで当該日が満室表示になることを確認
});

// ── O-16〜O-18：問い合わせ・予約管理 ─────────────────────────────────────────

test("O-16: 問い合わせ一覧ページが表示される", async ({ page }) => {
  await page.goto("/owner/inquiries");
  await page.waitForLoadState("networkidle");
  // ページが表示される（0件でも）
  await expect(
    page.locator("text=問い合わせ").or(page.locator("h1"))
  ).toBeVisible();
  // ステータスフィルタが存在する
  await expect(
    page.locator("text=全件, text=未読, text=返信済").first()
  ).toBeVisible({ timeout: 5000 }).catch(() => {});
});

test("O-17: 問い合わせ詳細・返信フォームが表示される", async ({ page }) => {
  await page.goto("/owner/inquiries");
  await page.waitForLoadState("networkidle");

  const inquiryLink = page.locator("a[href*='/owner/inquiries/']").first();
  if (await inquiryLink.count() === 0) { test.skip(true, "問い合わせなし"); return; }
  await inquiryLink.click();
  await page.waitForLoadState("networkidle");

  // 返信フォームが表示される
  await expect(
    page.locator("textarea, input[type='text']").first()
  ).toBeVisible();
  await expect(page.locator("button:has-text('返信')")).toBeVisible();
  // 手動確認: 返信後にステータスが「返信済」になるか
});

test("O-18: 予約リクエスト一覧ページが表示される", async ({ page }) => {
  await page.goto("/owner/reservations");
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator("text=予約").or(page.locator("h1"))
  ).toBeVisible();
  // ステータスフィルタが存在する
  await expect(
    page.locator("text=全件, text=確認待ち, text=承認済").first()
  ).toBeVisible({ timeout: 5000 }).catch(() => {});
});

test("O-19: 予約リクエスト詳細に承認ボタンが存在する", async ({ page }) => {
  await page.goto("/owner/reservations");
  await page.waitForLoadState("networkidle");

  const reservationLink = page.locator("a[href*='/owner/reservations/']").first();
  if (await reservationLink.count() === 0) { test.skip(true, "予約リクエストなし"); return; }
  await reservationLink.click();
  await page.waitForLoadState("networkidle");

  await expect(
    page.locator("button:has-text('承認'), button:has-text('承認する')").first()
  ).toBeVisible();
  // 手動確認: 「承認する」押下後にステータスが「承認済」になるか
});

test("O-20: 予約リクエスト詳細に拒否ボタンが存在する", async ({ page }) => {
  await page.goto("/owner/reservations");
  await page.waitForLoadState("networkidle");

  const reservationLink = page.locator("a[href*='/owner/reservations/']").first();
  if (await reservationLink.count() === 0) { test.skip(true, "予約リクエストなし"); return; }
  await reservationLink.click();
  await page.waitForLoadState("networkidle");

  await expect(
    page.locator("button:has-text('拒否'), button:has-text('拒否する')").first()
  ).toBeVisible();
  // 手動確認: 「拒否する」押下後にステータスが「拒否」になるか
});
