import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Topbar } from "@/app/components/Topbar";
import { listGenerationRecords } from "@/lib/records";

type RecordsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RecordsPage({ searchParams }: RecordsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = (await searchParams) || {};
  const view = firstParam(params.view) === "detail" ? "detail" : "list";
  const records = listGenerationRecords(user);
  const selectedId = firstParam(params.id);
  const selected = records.find((record) => record.id === selectedId) || records[0];

  return (
    <div className="app-shell">
      <Topbar user={user} />
      <main className="page">
        <h1>生成记录</h1>
        <p className="muted">{user.role === "admin" ? "管理员可查看所有用户的生成记录。" : "普通用户仅可查看自己的生成记录。"}</p>
        <div className="tabs compact-tabs">
          <Link className={view === "list" ? "active" : ""} href="/records">
            列表模式
          </Link>
          <Link className={view === "detail" ? "active" : ""} href={selected ? `/records?view=detail&id=${selected.id}` : "/records"}>
            详情模式
          </Link>
        </div>

        {view === "detail" && selected ? (
          <section className="panel">
            <p className="muted">
              {selected.displayName} · {selected.departmentName} · {new Date(selected.createdAt).toLocaleString()}
            </p>
            <h2>{selected.mode === "text-to-image" ? "文生图" : "图生图"}</h2>
            <p>{selected.prompt}</p>
            <p className="muted">
              {selected.model} · {selected.aspectRatio} · {selected.imageSize} · {selected.outputFormat.toUpperCase()} · {selected.durationMs}ms
            </p>
            <div className="result-grid">
              {selected.images.map((image) => (
                <div className="result-card" key={image.url}>
                  <img src={image.url} alt="生成结果" />
                  <p>
                    <a className="button secondary" href={image.url} download>
                      下载
                    </a>
                  </p>
                </div>
              ))}
            </div>
            <Link className="button secondary" href="/records">
              返回列表
            </Link>{" "}
            <form className="inline-form" method="post" action={`/api/records/${selected.id}`}>
              <button type="submit" className="danger">
                物理删除
              </button>
            </form>
          </section>
        ) : (
          <section className="panel">
            <div className="toolbar">
              <span className="muted">共 {records.length} 条记录</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>用户</th>
                    <th>部门</th>
                    <th>模式</th>
                    <th>模型</th>
                    <th>提示词</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{new Date(record.createdAt).toLocaleString()}</td>
                      <td>{record.displayName}</td>
                      <td>{record.departmentName}</td>
                      <td>{record.mode}</td>
                      <td>{record.model}</td>
                      <td className="prompt-cell">{record.prompt}</td>
                      <td className="actions-cell">
                        <Link className="button secondary" href={`/records?view=detail&id=${record.id}`}>
                          查看详情
                        </Link>{" "}
                        <form className="inline-form" method="post" action={`/api/records/${record.id}`}>
                          <button type="submit" className="danger">
                            物理删除
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {records.length === 0 ? <p className="muted">暂无生成记录</p> : null}
          </section>
        )}
      </main>
    </div>
  );
}
