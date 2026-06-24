import AuthForm from "@/components/AuthForm";

export const metadata = {
  title: "ログイン",
};

const REASON_MESSAGES: Record<string, string> = {
  timeout:
    "一定時間操作がなかったため、自動的にログアウトしました。お手数ですが再度ログインしてください。",
  expired:
    "セッションの有効期限が切れました。再度ログインしてください。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = reason ? (REASON_MESSAGES[reason] ?? null) : null;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        {message && (
          <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="mt-0.5 shrink-0" aria-hidden="true">⚠</span>
            <p>{message}</p>
          </div>
        )}
        <AuthForm />
      </div>
    </div>
  );
}
