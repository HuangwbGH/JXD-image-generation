import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppSettings, listDepartments } from "@/lib/settings";
import { Topbar } from "@/app/components/Topbar";

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const settings = getAppSettings();
  const departments = listDepartments();
  const params = (await searchParams) || {};
  const saved = firstParam(params.saved);
  const error = firstParam(params.error);

  return (
    <div className="app-shell">
      <Topbar user={user} />
      <main className="page">
        <h1>设置</h1>
        {saved ? <p className="success">配置已保存</p> : null}
        {error ? <p className="error">{decodeURIComponent(error)}</p> : null}

        <form method="post" action="/api/settings">
          <section className="panel">
            <h2>模型与代理</h2>
            <div className="field">
              <label>默认模型</label>
              <input name="defaultModel" defaultValue={settings.defaultModel} required />
            </div>
            <div className="field">
              <label>允许模型，逗号分隔</label>
              <input name="allowedModels" defaultValue={settings.allowedModels.join(",")} required />
            </div>
            <div className="field">
              <label>启用程序级代理</label>
              <select name="proxyEnabled" defaultValue={String(settings.proxyEnabled)}>
                <option value="true">启用</option>
                <option value="false">禁用</option>
              </select>
            </div>
            <div className="field">
              <label>HTTP 代理</label>
              <input name="appHttpProxy" defaultValue={settings.appHttpProxy} />
            </div>
            <div className="field">
              <label>HTTPS 代理</label>
              <input name="appHttpsProxy" defaultValue={settings.appHttpsProxy} />
            </div>
            <div className="field">
              <label>输出目录，相对路径</label>
              <input name="outputDir" defaultValue={settings.outputDir} required />
            </div>
            <div className="field">
              <label>最多上传图片数</label>
              <input name="uploadMaxImages" type="number" min={1} max={14} defaultValue={settings.uploadMaxImages} required />
            </div>
            <div className="field">
              <label>单图大小限制 MB</label>
              <input name="uploadMaxFileSizeMb" type="number" min={1} max={100} defaultValue={settings.uploadMaxFileSizeMb} required />
            </div>
          </section>

          <section className="panel">
            <h2>部门 API Key</h2>
            {departments.map((department) => (
              <div className="field" key={department.id}>
                <label>
                  {department.name} {department.hasApiKey ? "（已配置）" : "（未配置）"}
                </label>
                <input name={`apiKey_${department.id}`} type="password" placeholder="留空则不修改" />
              </div>
            ))}
            <button type="submit">保存配置</button>
          </section>
        </form>
      </main>
    </div>
  );
}
