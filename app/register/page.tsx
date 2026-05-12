import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "./RegisterForm";

type RegisterPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function registerErrorMessage(error: string | string[] | undefined) {
  if (error === "pending") return "该用户名已提交注册，请等待管理员审核";
  if (error === "exists") return "该用户名已存在，请更换用户名";
  return "";
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = (await searchParams) || {};
  if (params.username || params.password) redirect("/register");

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>自助注册</h1>
        <RegisterForm initialError={registerErrorMessage(params.error)} />
        <p className="muted">
          已有账号？ <Link href="/login">返回登录</Link>
        </p>
      </section>
    </main>
  );
}
