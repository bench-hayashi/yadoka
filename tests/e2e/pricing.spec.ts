import { test, expect } from "@playwright/test";

test.describe("料金計算API (/api/pricing)", () => {
  test("ミドル平日2泊の合計が90,000円・nights=2である", async ({ request }) => {
    // 2026-06-01(月) / 2026-06-02(火) → ミドル平日 ¥45,000 × 2
    const res = await request.get(
      "/api/pricing?facilityId=1&checkin=2026-06-01&checkout=2026-06-03"
    );
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.pricing).not.toBeNull();
    expect(data.pricing.totalPrice).toBe(90000);
    expect(data.pricing.nights).toBe(2);
  });

  test("平日1泊＋休日1泊の合計が100,000円である", async ({ request }) => {
    // 2026-06-05(金)平日 ¥45,000 + 2026-06-06(土)休日 ¥55,000
    const res = await request.get(
      "/api/pricing?facilityId=1&checkin=2026-06-05&checkout=2026-06-07"
    );
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.pricing).not.toBeNull();
    expect(data.pricing.totalPrice).toBe(100000);
  });

  test("ハイシーズン休日1泊＋平日1泊の合計が125,000円である", async ({ request }) => {
    // 2026-08-01(土)ハイ休日 ¥70,000 + 2026-08-02(日)ハイ平日 ¥55,000
    const res = await request.get(
      "/api/pricing?facilityId=1&checkin=2026-08-01&checkout=2026-08-03"
    );
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.pricing).not.toBeNull();
    expect(data.pricing.totalPrice).toBe(125000);
  });

  test("パラメータ不足時に400エラーが返る", async ({ request }) => {
    const res = await request.get("/api/pricing?facilityId=1&checkin=2026-06-01");
    expect(res.status()).toBe(400);

    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  test("checkin >= checkout のとき400エラーが返る", async ({ request }) => {
    const res = await request.get(
      "/api/pricing?facilityId=1&checkin=2026-06-03&checkout=2026-06-01"
    );
    expect(res.status()).toBe(400);
  });
});
