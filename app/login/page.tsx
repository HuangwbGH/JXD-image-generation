import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function loginErrorMessage(error: string | string[] | undefined) {
  if (error === "account") return "账号不存在、已禁用或尚未审核通过";
  if (error === "password") return "用户名或密码错误";
  return "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const params = (await searchParams) || {};
  if (params.username || params.password) redirect("/login");

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>登录</h1>
        {params.registered ? <p className="success">注册已提交，请等待管理员审核。</p> : null}
        <LoginForm initialError={loginErrorMessage(params.error)} />
        <p className="muted">
          没有账号？ <Link href="/register">自助注册</Link>
        </p>
      </section>
    </main>
  );
}
