import { test, expect } from "@playwright/test";

// facilityId=1 (fuji-view-villa-kawaguchiko) の料金設定（新モデル）:
//   minimum_price: ロー平日 ¥30,000 / ロー休日 ¥35,000
//                 ミドル平日 ¥45,000 / ミドル休日 ¥55,000
//                 ハイ平日 ¥55,000 / ハイ休日 ¥70,000
//   adult_fee, child_fee, infant_fee, pet_fee は 0（or minimum が人数料金を上回る値）
//
// 1泊合計 = max(minimum_price, 人数料金) + pets × pet_fee
// adults=2 デフォルト時: 人数料金 = 2 × adult_fee。adult_fee=0 なら minimum_price がそのまま適用される。

test.describe("料金計算API (/api/pricing)", () => {

  test("ミドル平日2泊の合計が90,000円・nights=2である", async ({ request }) => {
    // 2026-06-01(月) 2026-06-02(火) → ミドル平日 ¥45,000 × 2
    const res = await request.get(
      "/api/pricing?facilityId=1&checkin=2026-06-01&checkout=2026-06-03&adults=2"
    );
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.pricing).not.toBeNull();
    expect(data.pricing.totalPrice).toBe(90000);
    expect(data.pricing.nights).toBe(2);

    // guestBreakdown が返される
    expect(data.pricing.guestBreakdown).toMatchObject({
      adults: 2, children: 0, infants: 0, pets: 0,
    });
  });

  test("平日1泊＋休日1泊の合計が100,000円である", async ({ request }) => {
    // 2026-06-05(金)ミドル平日 ¥45,000 + 2026-06-06(土)ミドル休日 ¥55,000
    const res = await request.get(
      "/api/pricing?facilityId=1&checkin=2026-06-05&checkout=2026-06-07&adults=2"
    );
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.pricing).not.toBeNull();
    expect(data.pricing.totalPrice).toBe(100000);

    expect(data.pricing.guestBreakdown).toMatchObject({
      adults: 2, children: 0, infants: 0, pets: 0,
    });
  });

  test("ハイシーズン休日1泊＋平日1泊の合計が125,000円である", async ({ request }) => {
    // 2026-08-01(土)ハイ休日 ¥70,000 + 2026-08-02(日)ハイ平日 ¥55,000
    const res = await request.get(
      "/api/pricing?facilityId=1&checkin=2026-08-01&checkout=2026-08-03&adults=2"
    );
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.pricing).not.toBeNull();
    expect(data.pricing.totalPrice).toBe(125000);

    expect(data.pricing.guestBreakdown).toMatchObject({
      adults: 2, children: 0, infants: 0, pets: 0,
    });
  });

  test("breakdown に nightTotal / guestCharge / petCharge が含まれる", async ({ request }) => {
    const res = await request.get(
      "/api/pricing?facilityId=1&checkin=2026-06-01&checkout=2026-06-02&adults=2"
    );
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.pricing).not.toBeNull();
    expect(data.pricing.breakdown).toHaveLength(1);

    const night = data.pricing.breakdown[0];
    expect(night).toMatchObject({
      date:      "2026-06-01",
      dayType:   "weekday",
      isOverride: false,
      overrideType: null,
    });
    // 数値フィールドが存在すること
    expect(typeof night.minimumPrice).toBe("number");
    expect(typeof night.guestCharge).toBe("number");
    expect(typeof night.petCharge).toBe("number");
    expect(typeof night.nightTotal).toBe("number");
    // nightTotal = minimumPrice or guestCharge（大きい方）+ petCharge
    expect(night.nightTotal).toBe(
      Math.max(night.minimumPrice, night.guestCharge) + night.petCharge
    );
  });

  test("adults/children/infants/pets パラメータが guestBreakdown に反映される", async ({ request }) => {
    const res = await request.get(
      "/api/pricing?facilityId=1&checkin=2026-06-01&checkout=2026-06-02&adults=3&children=2&infants=1&pets=1"
    );
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.pricing).not.toBeNull();
    expect(data.pricing.guestBreakdown).toMatchObject({
      adults: 3, children: 2, infants: 1, pets: 1,
    });
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
