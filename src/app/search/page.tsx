type SearchParams = Promise<{
  area?: string;
  checkin?: string;
  checkout?: string;
  guests?: string;
  tag?: string;
}>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { area, checkin, checkout, guests, tag } = await searchParams;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">検索結果</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">検索条件</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-400 shrink-0">エリア</dt>
            <dd className="text-gray-900 font-medium">{area ?? "未選択"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-400 shrink-0">チェックイン</dt>
            <dd className="text-gray-900 font-medium">{checkin ?? "未選択"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-400 shrink-0">チェックアウト</dt>
            <dd className="text-gray-900 font-medium">{checkout ?? "未選択"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-400 shrink-0">人数</dt>
            <dd className="text-gray-900 font-medium">{guests ? `${guests}名` : "未選択"}</dd>
          </div>
          {tag && (
            <div className="flex gap-2">
              <dt className="text-gray-400 shrink-0">タグ</dt>
              <dd className="text-gray-900 font-medium">{tag}</dd>
            </div>
          )}
        </dl>
      </div>

      <p className="mt-8 text-sm text-gray-400">
        この画面は次のステップで検索結果一覧に更新します。
      </p>
    </div>
  );
}
