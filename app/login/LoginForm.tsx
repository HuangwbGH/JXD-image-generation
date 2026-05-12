"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ initialError = "" }: { initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      })
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "登录失败");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form method="post" action="/api/auth/login" onSubmit={submit}>
      <div className="field">
        <label>用户名</label>
        <input name="username" required autoComplete="username" />
      </div>
      <div className="field">
        <label>密码</label>
        <input name="password" type="password" required autoComplete="current-password" />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button disabled={loading} type="submit">
        {loading ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
