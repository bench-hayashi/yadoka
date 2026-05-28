import AuthForm from "@/components/AuthForm";

export const metadata = {
  title: "ログイン",
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <AuthForm />
    </div>
  );
}
