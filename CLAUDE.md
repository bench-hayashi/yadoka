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

### facility_images
`id`, `facility_id`, `url`, `alt_text`, `sort_order`, `is_hero`, `created_at`

### facility_tags
`facility_id`, `tag_id`

### seasons
`id`, `facility_id`, `name`, `start_date`, `end_date`, `created_at`

### pricing_rules
`id`, `facility_id`, `season`, `day_type`, `price_per_night`, `created_at`

### pricing_overrides
`id`, `facility_id`, `target_date`, `price_per_night`, `reason`, `created_at`

### availability
`id`, `facility_id`, `target_date`, `is_available`, `source`, `created_at`

### favorites
`id`, `user_id`, `facility_id`, `created_at`

### inquiries
`id`, `facility_id`, `user_id`, `guest_name`, `guest_email`, `guest_phone`, `guest_count`, `checkin_date`, `checkout_date`, `message`, `status`, `created_at`, `updated_at`

### reservation_requests
`id`, `facility_id`, `user_id`, `guest_name`, `guest_email`, `guest_phone`, `guest_count`, `checkin_date`, `checkout_date`, `total_price`, `message`, `status`, `owner_reply`, `created_at`, `updated_at`
