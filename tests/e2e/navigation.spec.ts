import { test, expect } from "@playwright/test";

const SLUG = "fuji-view-villa-kawaguchiko";

test.describe("画面遷移（導線）", () => {
  test("トップページ → 検索ボタン → 検索結果一覧に遷移する", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "この条件で検索する" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByText(/件の施設が見つかりました|見つかりませんでした/)).toBeVisible();
  });

  test("検索結果 → 施設カードクリック → 施設詳細に遷移する", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    const card = page.locator('a[href^="/facility/"]').first();
    const href = await card.getAttribute("href");
    await card.click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("施設詳細 → 問い合わせボタン → 問い合わせフォームに遷移する", async ({ page }) => {
    await page.goto(`/facility/${SLUG}`);
    await page.waitForLoadState("networkidle");

    // PriceSimulator のリンクが表示されるまで待つ
    await page.getByRole("link", { name: "この条件で問い合わせる" }).first().click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/inquiry/);
    await expect(page.getByRole("heading", { name: "お問い合わせ" })).toBeVisible({
      timeout: 15000,
    });
  });

  test("施設詳細 → 予約リクエストボタン → 予約フォームに遷移する", async ({ page }) => {
    await page.goto(`/facility/${SLUG}`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: "予約リクエストを送る" }).first().click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/reserve/);
    await expect(page.getByRole("heading", { name: "予約リクエスト" })).toBeVisible({
      timeout: 15000,
    });
  });

  test("ヘッダーのYADOKAロゴクリック → トップページに戻る", async ({ page }) => {
    // 検索ページから戻る
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    await page.locator("header a", { hasText: "YADOKA" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "YADOKA" })).toBeVisible();
  });
});
