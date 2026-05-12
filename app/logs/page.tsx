import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Topbar } from "@/app/components/Topbar";
import { listSystemLogs } from "@/lib/logging/list-logs";

type LogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export default async function LogsPage({ searchParams }: LogsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const params = (await searchParams) || {};
  const level = firstParam(params.level);
  const action = firstParam(params.action);
  const logs = listSystemLogs({ level, action });

  return (
    <div className="app-shell">
      <Topbar user={user} />
      <main className="page">
        <h1>系统日志</h1>
        <section className="panel">
          <form method="get">
            <div className="field">
              <label>级别</label>
              <select name="level" defaultValue={level}>
                <option value="">全部</option>
                <option value="info">info</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
              </select>
            </div>
            <div className="field">
              <label>动作过滤</label>
              <input name="action" defaultValue={action} placeholder="generation / auth / settings" />
            </div>
            <button type="submit">查询</button>
          </form>
        </section>
        <section className="panel">
          <p className="muted">共 {logs.length} 条日志</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>级别</th>
                  <th>动作</th>
                  <th>用户</th>
                  <th>消息</th>
                  <th>元数据</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.level}</td>
                    <td>{log.action}</td>
                    <td>{log.username || "-"}</td>
                    <td>{log.message}</td>
                    <td>
                      <details>
                        <summary>查看</summary>
                        <code>{JSON.stringify(log.metadata)}</code>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 ? <p className="muted">暂无系统日志</p> : null}
        </section>
      </main>
    </div>
  );
}
