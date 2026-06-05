@AGENTS.md

# YADOKA

貸別荘・一棟貸し専門の検索ポータルサイト。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **データベース**: Supabase
- **スタイリング**: Tailwind CSS
- **デプロイ**: Vercel

## ユーザー種別

- **旅行者**: 施設を検索・予約する一般ユーザー
- **施設オーナー**: 自施設を登録・管理するオーナー
- **管理者**: プラットフォーム全体を管理する運営者

## MVPスコープ

### 旅行者
- 施設検索・一覧表示
- 施設詳細表示
- お気に入り登録
- 施設への問い合わせ
- 料金自動計算

### 施設オーナー
- 施設登録
- 料金・空室管理
- 問い合わせ管理

### 管理者
- 施設審査・掲載管理
- タグ管理

## データベーステーブル構造

コードで列名を誤用しないよう、正確なカラム名を以下に記録する。

### profiles
`id`(uuid), `role`, `display_name`, `email`, `phone`, `avatar_url`, `created_at`, `updated_at`

### areas
`id`, `name`, `slug`, `prefecture`, `sort_order`, `created_at`

### tags
`id`, `name`, `slug`, `category`, `sort_order`, `created_at`

### facilities
`id`, `owner_id`, `name`, `slug`, `description`, `area_id`, `address`, `latitude`, `longitude`, `max_guests`, `bedrooms`, `bathrooms`, `parking_spaces`, `checkin_time`, `checkout_time`, `min_nights`, `license_type`, `license_number`, `status`, `is_published`, `published_at`, `created_at`, `updated_at`

> `ical_import_url` カラムは未使用。iCalインポートURLは `ical_import_sources` テーブルで管理する。

### facility_images
`id`, `facility_id`, `url`, `alt_text`, `sort_order`, `is_hero`, `created_at`

### facility_tags
`facility_id`, `tag_id`

### seasons
`id`, `facility_id`, `name`, `start_date`, `end_date`, `created_at`

### simple_seasons
`id`, `facility_id`, `month`(1〜12), `season`('low'|'mid'|'high'), `created_at`

### pricing_rules
`id`, `facility_id`, `season`, `day_type`, `minimum_price`, `adult_fee`, `child_fee`, `infant_fee`, `pet_fee`, `created_at`

### pricing_overrides
`id`, `facility_id`, `target_date`, `override_amount`, `override_type`('flat'|'minimum'), `reason`, `created_at`

### availability
`id`, `facility_id`, `target_date`, `is_available`, `source`, `created_at`

### favorites
`id`, `user_id`, `facility_id`, `created_at`

### inquiries
`id`, `facility_id`, `user_id`, `guest_name`, `guest_email`, `guest_phone`, `guest_count`, `checkin_date`, `checkout_date`, `message`, `status`, `created_at`, `updated_at`

### reservation_requests
`id`, `facility_id`, `user_id`, `guest_name`, `guest_email`, `guest_phone`, `guest_count`, `adults_count`, `children_count`, `infants_count`, `pets_count`, `checkin_date`, `checkout_date`, `total_price`, `message`, `status`, `owner_reply`, `created_at`, `updated_at`

### ical_import_sources
`id`, `facility_id`, `name`, `url`, `last_synced_at`, `created_at`

施設ごとに複数のiCal URLを登録できる。同期時（`POST /api/ical/sync`）は登録された全URLを取得・統合し、`availability` の `source='ical'` レコードをまとめて洗い替える。`source='manual'` / `source='reservation'` の日付は上書きしない。

## 料金計算モデル

### シーズン判定（優先順位）
1. **詳細シーズン**（`seasons` テーブル）：日付範囲で指定した期間が最優先
2. **簡易シーズン**（`simple_seasons` テーブル）：月単位で毎年繰り返し適用
3. **デフォルト**：上記どちらにも該当しない場合は `low`（ローシーズン）

曜日判定：土曜泊 = `weekend`、それ以外 = `weekday`

### 1泊料金の計算手順

```
人数料金 = adults × adult_fee + children × child_fee + infants × infant_fee
ペット料金 = pets × pet_fee  （常にシーズンルールから取得）

＜その日に pricing_overrides がある場合＞
  override_type = 'flat'    → 1泊小計 = override_amount
  override_type = 'minimum' → 1泊小計 = max(override_amount, 人数料金)

＜上書きがない場合＞
  1泊小計 = max(minimum_price, 人数料金)

1泊合計 = 1泊小計 + ペット料金
```

総額 = 全宿泊日の 1泊合計 を合算

### 料金API
`GET /api/pricing?facilityId=&checkin=&checkout=&adults=&children=&infants=&pets=`

レスポンス:
```json
{
  "pricing": {
    "totalPrice": number,
    "nights": number,
    "guestBreakdown": { "adults": number, "children": number, "infants": number, "pets": number },
    "breakdown": [{
      "date": string, "dayType": string, "season": string,
      "isOverride": boolean, "overrideType": "flat"|"minimum"|null,
      "minimumPrice": number, "guestCharge": number, "petCharge": number, "nightTotal": number
    }]
  },
  "availability": { "isAvailable": boolean, "unavailableDates": string[] }
}
```
