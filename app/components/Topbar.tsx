import Link from "next/link";
import { CurrentUser } from "@/lib/auth/session";

export function Topbar({ user }: { user: CurrentUser }) {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        JXD Gemini
      </Link>
      <nav className="nav">
        <Link href="/records">生成记录</Link>
        {user.role === "admin" ? <Link href="/users">用户管理</Link> : null}
        {user.role === "admin" ? <Link href="/logs">日志</Link> : null}
        {user.role === "admin" ? <Link href="/settings">设置</Link> : null}
        <span className="muted">
          {user.displayName} · {user.role === "admin" ? "管理员" : user.departmentName}
        </span>
        <form action="/api/auth/logout" method="post">
          <button className="secondary" type="submit">
            退出
          </button>
        </form>
      </nav>
    </header>
  );
}
