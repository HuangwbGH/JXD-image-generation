"use client";

import { useState } from "react";

export function RegisterForm({ initialError = "" }: { initialError?: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
          displayName: form.get("displayName"),
          departmentId: form.get("departmentId")
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "注册失败，请检查填写内容后重试");
        return;
      }
      event.currentTarget.reset();
      setMessage("注册申请已提交。审核通过后即可使用该账号登录。");
    } catch {
      setError("网络异常，注册申请未提交，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form method="post" action="/api/auth/register" onSubmit={submit}>
      <div className="field">
        <label>用户名</label>
        <input name="username" required />
      </div>
      <div className="field">
        <label>密码</label>
        <input name="password" type="password" minLength={6} required />
      </div>
      <div className="field">
        <label>展示名</label>
        <input name="displayName" required />
      </div>
      <div className="field">
        <label>部门</label>
        <select name="departmentId" required defaultValue="rd_1">
          <option value="rd_1">研发一部</option>
          <option value="rd_2">研发二部</option>
        </select>
      </div>
      {error ? (
        <div className="alert alert-error" role="alert">
          <strong>注册失败</strong>
          <span>{error}</span>
        </div>
      ) : null}
      {message ? (
        <div className="alert alert-success" role="status">
          <strong>提交成功</strong>
          <span>{message}</span>
        </div>
      ) : null}
      <button disabled={loading} type="submit">
        {loading ? "提交中..." : "提交注册"}
      </button>
    </form>
  );
}
