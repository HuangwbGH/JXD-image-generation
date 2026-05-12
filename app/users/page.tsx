import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listDepartments } from "@/lib/settings";
import { Topbar } from "@/app/components/Topbar";
import { listAdminUsers } from "@/lib/admin/users";

function statusLabel(status: string) {
  if (status === "pending") return "待审核";
  if (status === "active") return "已通过";
  if (status === "rejected") return "已拒绝";
  return status;
}

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const users = listAdminUsers();
  const departments = listDepartments();

  return (
    <div className="app-shell">
      <Topbar user={user} />
      <main className="page">
        <h1>用户管理</h1>

        <section className="panel">
          <h2>创建用户</h2>
          <form method="post" action="/api/admin/users">
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
              <label>角色</label>
              <select name="role" defaultValue="user">
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div className="field">
              <label>部门</label>
              <select name="departmentId" defaultValue="rd_1">
                {departments.map((department) => (
                  <option value={department.id} key={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit">创建用户</button>
          </form>
        </section>

        <section className="panel">
          <div className="toolbar">
            <h2>用户列表</h2>
            <span className="muted">共 {users.length} 个用户</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>展示名</th>
                  <th>部门</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>启用</th>
                  <th>审核</th>
                  <th>账号状态</th>
                  <th>重置密码</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.username}</td>
                    <td>{item.displayName}</td>
                    <td>{item.departmentName || "-"}</td>
                    <td>{item.role}</td>
                    <td>{statusLabel(item.status)}</td>
                    <td>{item.enabled ? "启用" : "禁用"}</td>
                    <td className="actions-cell">
                      {item.status === "pending" ? (
                        <>
                          <form className="inline-form" method="post" action={`/api/admin/users/${item.id}/approve`}>
                            <input type="hidden" name="role" value={item.role || "user"} />
                            <input type="hidden" name="departmentId" value={item.departmentId || "rd_1"} />
                            <button type="submit">通过</button>
                          </form>
                          <form className="inline-form" method="post" action={`/api/admin/users/${item.id}/reject`}>
                            <button type="submit" className="danger">
                              拒绝
                            </button>
                          </form>
                        </>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      {item.username === "admin" ? (
                        <span className="muted">内置管理员</span>
                      ) : (
                        <form className="inline-form" method="post" action={`/api/admin/users/${item.id}/enable`}>
                          <input type="hidden" name="enabled" value={item.enabled ? "false" : "true"} />
                          <button type="submit">{item.enabled ? "禁用" : "启用"}</button>
                        </form>
                      )}
                    </td>
                    <td>
                      {item.username === "admin" ? (
                        <span className="muted">-</span>
                      ) : (
                        <form className="inline-form reset-form" method="post" action={`/api/admin/users/${item.id}/reset-password`}>
                          <input name="password" type="password" minLength={6} placeholder="新密码" required />
                          <button type="submit">重置</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 ? <p className="muted">暂无用户</p> : null}
        </section>
      </main>
    </div>
  );
}
