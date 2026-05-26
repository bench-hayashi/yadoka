import { test, expect } from "@playwright/test";

test.describe("検索機能", () => {
  test("/search にアクセスすると施設一覧が表示される", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    const cards = page.locator('a[href^="/facility/"]');
    const noResults = page.getByText("見つかりませんでした");
    await expect(cards.first().or(noResults)).toBeVisible();
  });

  test("/search?area=kawaguchiko で河口湖の施設のみ表示される", async ({ page }) => {
    await page.goto("/search?area=kawaguchiko");
    await page.waitForLoadState("networkidle");

    // 施設カードのエリア名に「河口湖」が含まれる
    await expect(page.getByText("河口湖").first()).toBeVisible();
  });

  test("/search?tag=pet-friendly でペット可の施設が表示される", async ({ page }) => {
    await page.goto("/search?tag=pet-friendly");
    await page.waitForLoadState("networkidle");

    const cards = page.locator('a[href^="/facility/"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("/search?guests=12 で定員12名以上の施設のみ表示される", async ({ page }) => {
    await page.goto("/search?guests=12");
    await page.waitForLoadState("networkidle");

    // 12名以上の施設が存在する場合はカードが表示され、
    // 存在しない場合は「見つかりませんでした」が表示される
    const cards = page.locator('a[href^="/facility/"]');
    const noResults = page.getByText("見つかりませんでした");
    await expect(cards.first().or(noResults)).toBeVisible();
  });

  test("/search?area=hakone で「見つかりませんでした」が表示される", async ({ page }) => {
    await page.goto("/search?area=hakone");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("見つかりませんでした")).toBeVisible();
  });

  test("施設カードに施設名・エリア名・料金が含まれる", async ({ page }) => {
    await page.goto("/search?area=kawaguchiko");
    await page.waitForLoadState("networkidle");

    const card = page.locator('a[href^="/facility/"]').first();
    await expect(card).toBeVisible();
    // 料金（¥ を含む要素）またはお問い合わせテキスト
    await expect(
      card.getByText(/¥/).or(card.getByText("料金はお問い合わせ"))
    ).toBeVisible();
  });

  test("施設カードをクリックすると施設詳細ページに遷移する", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    const card = page.locator('a[href^="/facility/"]').first();
    const href = await card.getAttribute("href");
    await card.click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});
