import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppSettings, listDepartments } from "@/lib/settings";
import { Topbar } from "@/app/components/Topbar";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const settings = getAppSettings();
  const departments = listDepartments();
  const params = (await searchParams) || {};
  const error = firstParam(params.error);
  const ratios = ["auto", "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"];
  const initialPayload = {
    mode: "text-to-image",
    model: settings.defaultModel,
    departmentId: user.role === "admin" ? departments[0]?.id || "rd_1" : user.departmentId,
    prompt: "",
    aspectRatio: "auto",
    imageSize: "1K",
    outputFormat: "png",
    images: []
  };

  return (
    <div className="app-shell">
      <Topbar user={user} />
      <main className="generator">
        <form className="panel" method="post" action="/api/generate" encType="multipart/form-data">
          <input type="hidden" name="responseMode" value="html" />
          <h1>生图</h1>

          <div className="field">
            <label>当前用户</label>
            <input value={`${user.displayName} · ${user.role === "admin" ? "管理员" : user.departmentName}`} readOnly />
          </div>

          <div className="field">
            <label>生成模式</label>
            <div className="choice-grid two">
              <input id="mode-text" type="radio" name="mode" value="text-to-image" defaultChecked />
              <label htmlFor="mode-text">文生图</label>
              <input id="mode-image" type="radio" name="mode" value="image-to-image" />
              <label htmlFor="mode-image">图生图</label>
            </div>
          </div>

          {user.role === "admin" ? (
            <div className="field">
              <label>管理员生成使用部门</label>
              <select name="departmentId" defaultValue={departments[0]?.id || "rd_1"}>
                {departments.map((department) => (
                  <option value={department.id} key={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="field">
            <label>AI 模型</label>
            <select name="model" defaultValue={settings.defaultModel}>
              {settings.allowedModels.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="field upload-field" id="upload-field" hidden>
            <label>图片，图生图模式必填</label>
            <input type="file" name="images" multiple accept="image/png,image/jpeg,image/webp" />
            <span className="muted">
              最多 {settings.uploadMaxImages} 张，单图最大 {settings.uploadMaxFileSizeMb}MB
            </span>
            <div className="upload-preview-grid" id="upload-preview-grid" />
          </div>

          <div className="field">
            <label>提示词</label>
            <textarea name="prompt" maxLength={5000} required placeholder="描述您想生成或编辑的画面..." />
          </div>

          <div className="field">
            <label>分辨率</label>
            <div className="choice-grid three">
              {["1K", "2K", "4K"].map((item) => (
                <span key={item}>
                  <input id={`size-${item}`} type="radio" name="imageSize" value={item} defaultChecked={item === "1K"} />
                  <label htmlFor={`size-${item}`}>{item}</label>
                </span>
              ))}
            </div>
          </div>

          <div className="field">
            <label>输出格式</label>
            <div className="choice-grid two">
              {(["png", "jpg"] as const).map((item) => (
                <span key={item}>
                  <input id={`format-${item}`} type="radio" name="outputFormat" value={item} defaultChecked={item === "png"} />
                  <label htmlFor={`format-${item}`}>{item.toUpperCase()}</label>
                </span>
              ))}
            </div>
          </div>

          <div className="field">
            <label>纵横比</label>
            <div className="choice-grid ratio-grid">
              {ratios.map((item) => (
                <span key={item}>
                  <input id={`ratio-${item.replace(":", "-")}`} type="radio" name="aspectRatio" value={item} defaultChecked={item === "auto"} />
                  <label htmlFor={`ratio-${item.replace(":", "-")}`}>{item === "auto" ? "自动" : item}</label>
                </span>
              ))}
            </div>
          </div>

          {error ? <p className="error">{decodeURIComponent(error)}</p> : null}

          <button type="submit">生成</button>

          <div className="field payload-preview">
            <label>即将发送内容</label>
            <pre id="payload-preview">{JSON.stringify(initialPayload, null, 2)}</pre>
          </div>
        </form>

        <section className="preview">
          <div className="preview-inner" id="generation-status">
            <div className="muted">
              <h2>就绪创建</h2>
              <p>填写表单并点击生成。生成成功后会自动进入生成记录详情页。</p>
            </div>
          </div>
        </section>
      </main>
      <script
        dangerouslySetInnerHTML={{
          __html: `
(() => {
  const form = document.querySelector('form[action="/api/generate"]');
  const preview = document.getElementById('payload-preview');
  const status = document.getElementById('generation-status');
  const uploadField = document.getElementById('upload-field');
  const uploadInput = form.querySelector('input[type="file"][name="images"]');
  const uploadPreview = document.getElementById('upload-preview-grid');
  if (!form || !preview) return;
  const userDepartmentId = ${JSON.stringify(user.departmentId || "")};
  const isAdmin = ${JSON.stringify(user.role === "admin")};
  function value(name, fallback) {
    const checked = form.querySelector('[name="' + name + '"]:checked');
    const field = checked || form.querySelector('[name="' + name + '"]');
    return field && field.value ? field.value : fallback;
  }
  function files() {
    return Array.from(uploadInput && uploadInput.files ? uploadInput.files : []).map((file) => ({
      name: file.name,
      mimeType: file.type,
      size: file.size
    }));
  }
  function updateUploadVisibility() {
    const isImageMode = value('mode', 'text-to-image') === 'image-to-image';
    if (uploadField) uploadField.hidden = !isImageMode;
    if (uploadInput) {
      uploadInput.disabled = !isImageMode;
      uploadInput.required = isImageMode;
      if (!isImageMode) uploadInput.value = '';
    }
    if (!isImageMode && uploadPreview) uploadPreview.innerHTML = '';
  }
  function updateUploadPreview() {
    if (!uploadPreview || !uploadInput) return;
    uploadPreview.innerHTML = '';
    Array.from(uploadInput.files || []).forEach((file) => {
      const item = document.createElement('div');
      item.className = 'upload-thumb';
      const img = document.createElement('img');
      img.alt = file.name;
      img.src = URL.createObjectURL(file);
      const caption = document.createElement('span');
      caption.textContent = file.name;
      item.append(img, caption);
      uploadPreview.append(item);
    });
  }
  function update() {
    updateUploadVisibility();
    const payload = {
      mode: value('mode', 'text-to-image'),
      model: value('model', ''),
      departmentId: isAdmin ? value('departmentId', '') : userDepartmentId,
      prompt: value('prompt', ''),
      aspectRatio: value('aspectRatio', 'auto'),
      imageSize: value('imageSize', '1K'),
      outputFormat: value('outputFormat', 'png'),
      images: value('mode', 'text-to-image') === 'image-to-image' ? files() : []
    };
    preview.textContent = JSON.stringify(payload, null, 2);
  }
  const statusKey = 'jxd:last-generation-status';
  let restoring = false;
  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function renderLoading() {
    if (!status) return;
    status.dataset.state = 'loading';
    clearNode(status);
    const wrap = document.createElement('div');
    wrap.className = 'muted loading-state';
    const title = document.createElement('h2');
    title.textContent = '正在生图中';
    const text = document.createElement('p');
    text.textContent = '请求已提交，请稍候。生成时间取决于模型、图片数量和代理网络。';
    wrap.append(title, text);
    status.append(wrap);
  }
  function renderError(message) {
    if (!status) return;
    status.dataset.state = 'error';
    clearNode(status);
    const wrap = document.createElement('div');
    wrap.className = 'error-state';
    const title = document.createElement('h2');
    title.textContent = '生成失败';
    const text = document.createElement('p');
    text.textContent = message || '生成失败，请稍后重试';
    wrap.append(title, text);
    status.append(wrap);
    sessionStorage.setItem(statusKey, JSON.stringify({ type: 'error', message: text.textContent, at: Date.now() }));
  }
  function renderSuccess(result) {
    if (!status) return;
    status.dataset.state = 'success';
    clearNode(status);
    const title = document.createElement('p');
    title.className = 'success';
    title.textContent = '生成完成' + (result.durationMs ? ' · ' + result.durationMs + 'ms' : '');
    status.append(title);
    const grid = document.createElement('div');
    grid.className = 'result-grid';
    const images = Array.isArray(result.images) ? result.images : [];
    images.forEach((image, index) => {
      const card = document.createElement('div');
      card.className = 'result-card';
      const img = document.createElement('img');
      img.src = image.url;
      img.alt = '生成结果 ' + (index + 1);
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.className = 'button secondary';
      a.href = image.url;
      a.download = '';
      a.textContent = '下载';
      p.append(a);
      card.append(img, p);
      grid.append(card);
    });
    status.append(grid);
    if (result.id) {
      const p = document.createElement('p');
      const link = document.createElement('a');
      link.className = 'button secondary';
      link.href = '/records?view=detail&id=' + encodeURIComponent(result.id);
      link.textContent = '查看记录详情';
      p.append(link);
      status.append(p);
    }
    sessionStorage.setItem(statusKey, JSON.stringify({ type: 'success', result, at: Date.now() }));
  }
  function restoreLastStatus() {
    if (!status || restoring) return;
    const raw = sessionStorage.getItem(statusKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (!saved.at || Date.now() - saved.at > 30 * 60 * 1000) {
        sessionStorage.removeItem(statusKey);
        return;
      }
      if (saved.type === 'success' && !status.innerText.includes('生成完成')) {
        restoring = true;
        renderSuccess(saved.result || {});
        restoring = false;
      }
      if (saved.type === 'error' && !status.innerText.includes('生成失败')) {
        restoring = true;
        renderError(saved.message || '生成失败，请稍后重试');
        restoring = false;
      }
    } catch {
      sessionStorage.removeItem(statusKey);
    }
  }
  if (status && window.MutationObserver) {
    const observer = new MutationObserver(() => {
      if (!restoring) window.setTimeout(restoreLastStatus, 0);
    });
    observer.observe(status, { childList: true, subtree: true });
  }
  form.addEventListener('input', update);
  form.addEventListener('change', () => {
    updateUploadPreview();
    update();
  });
  form.addEventListener('submit', async (event) => {
    if (!window.fetch || !window.FormData || !status) return;
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    sessionStorage.removeItem(statusKey);
    renderLoading();
    const data = new FormData(form);
    data.set('responseMode', 'json');
    try {
      const response = await fetch('/api/generate', { method: 'POST', body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = result.error || '生成失败，请稍后重试';
        renderError(message);
        return;
      }
      renderSuccess(result);
    } catch {
      renderError('请求失败，请检查网络连接后重试。');
    } finally {
      if (submit) submit.disabled = false;
    }
  });
  update();
  window.setTimeout(restoreLastStatus, 0);
  window.setTimeout(restoreLastStatus, 800);
  window.addEventListener('pageshow', restoreLastStatus);
})();
`
        }}
      />
    </div>
  );
}
