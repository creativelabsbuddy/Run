import { emptyBuild, type ProjectBuild } from "@/lib/build-flow";
import { claimOwnedProjects, createOwnedProject, deleteOwnedProject, getOwnedProject, listOwnedProjects, saveOwnedProject } from "@/lib/projects-api";
import { currentWorkspaceId } from "@/lib/workspaces";

export const CREDIT_PACK = 120;
export const CREDIT_PACK_PRICE = 800;
const KEY = "run.projects";
const CREDITS_KEY = "run.credits";
const CAP_KEY = "run.creditCap";

export type ProjectMsg = { id: string; role: "user" | "assistant"; text: string };
export type ProjectPreview = { heading: string; button: string };

export type ProjectVersion = {
  id: string;
  at: string;
  note: string;
  messages: ProjectMsg[];
  html: string;
  preview: ProjectPreview | null;
};

export type ProjectUndo = { html: string; files?: Record<string, string> };

export type Project = {
  id: string;
  ownerId: string;
  prompt: string;
  title: string;
  updatedAt: string;
  messages: ProjectMsg[];
  html: string;
  preview: ProjectPreview | null;
  versions: ProjectVersion[];
  build: ProjectBuild;
  workspaceId: string;
  appData: Record<string, string>;
  undo: ProjectUndo | null;
  assets: string[];
  files: Record<string, string>;
};

function readAll(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const project = asProject(item);
      return project ? [project] : [];
    });
  } catch {
    return [];
  }
}

function asProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<Project> & { preview?: ProjectPreview | null };
  if (!item.id || !item.ownerId) return null;
  const preview = item.preview?.heading ? item.preview : null;
  const prompt = item.prompt || item.title || "Untitled";
  return {
    id: item.id,
    ownerId: item.ownerId,
    prompt,
    title: item.title || prompt,
    updatedAt: item.updatedAt || new Date().toISOString(),
    messages: Array.isArray(item.messages) ? item.messages : [],
    html: typeof item.html === "string" ? item.html : preview ? previewHtml(preview.heading) : "",
    preview,
    versions: Array.isArray(item.versions) ? item.versions : [],
    build: item.build?.step !== undefined || item.build?.pending !== undefined ? { ...emptyBuild(), ...item.build } : emptyBuild(),
    workspaceId: item.workspaceId || "personal",
    appData: item.appData && typeof item.appData === "object" ? item.appData : {},
    undo: item.undo?.html ? { html: item.undo.html, files: item.undo.files } : null,
    assets: Array.isArray(item.assets) ? item.assets.filter((asset) => typeof asset === "string") : [],
    files: item.files && typeof item.files === "object" ? item.files : {},
  };
}

function writeAll(projects: Project[]) {
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

export function previewHtml(heading: string): string {
  const safe = escapeHtml(heading.slice(0, 80));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0e16;color:#f5f5f7;font-family:system-ui"><main style="text-align:center;padding:24px"><h1 style="margin:0;font-size:32px">${safe}</h1><a style="display:inline-block;margin-top:24px;padding:12px 20px;border-radius:999px;background:linear-gradient(90deg,#8b6cff,#5b8cff);color:#fff;text-decoration:none">Get started</a></main></body></html>`;
}

export function shortTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentence = clean.split(/[.\n]/)[0]?.trim() || clean;
  if (!sentence) return "Untitled";
  if (sentence.length <= 36) return sentence;
  const cut = sentence.slice(0, 36);
  const last = cut.lastIndexOf(" ");
  return (last > 12 ? cut.slice(0, last) : cut).trim();
}

export function createProject(ownerId: string, prompt: string): string {
  const id = `project-${Date.now()}`;
  const now = new Date().toISOString();
  const projects = readAll();
  projects.unshift({
    id,
    ownerId,
    prompt,
    title: shortTitle(prompt),
    updatedAt: now,
    messages: [],
    html: "",
    preview: null,
    versions: [],
    build: emptyBuild(),
    workspaceId: currentWorkspaceId(),
    appData: {},
    undo: null,
    assets: [],
    files: {},
  });
  writeAll(projects);
  return id;
}

export function loadProject(id: string): Project | null {
  return readAll().find((project) => project.id === id) ?? null;
}

export function projectsFor(ownerId: string): Project[] {
  return readAll()
    .filter((project) => project.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveProject(project: Project) {
  const projects = readAll();
  const index = projects.findIndex((item) => item.id === project.id);
  if (index === -1) projects.unshift(project);
  else projects[index] = project;
  writeAll(projects);
}

export function listLocalProjects(): Project[] {
  return readAll();
}

export async function startProject(prompt: string, ownerId: string): Promise<string> {
  const id = await createOwnedProject({ data: { prompt, workspaceId: currentWorkspaceId() } });
  if (!id) throw new Error("Could not save the project.");
  const now = new Date().toISOString();
  saveProject({
    id,
    ownerId,
    prompt,
    title: shortTitle(prompt),
    updatedAt: now,
    messages: [],
    html: "",
    preview: null,
    versions: [],
    build: emptyBuild(),
    workspaceId: currentWorkspaceId(),
    appData: {},
    undo: null,
    assets: [],
    files: {},
  });
  return id;
}

export async function openOwned(id: string): Promise<Project | null> {
  const local = loadProject(id);
  try {
    const row = await getOwnedProject({ data: id });
    if (row && (!local || row.updatedAt >= local.updatedAt)) {
      saveProject(row);
      return row;
    }
  } catch {
    /* keep the copy on this phone */
  }
  return local;
}

export async function accountProjects(): Promise<Project[]> {
  const seen = new Set<string>();
  const rows: Project[] = [];
  try {
    for (const row of await listOwnedProjects()) {
      saveProject(row);
      rows.push(row);
      seen.add(row.id);
    }
  } catch {
    /* phone copy still shows */
  }
  for (const local of readAll()) {
    if (seen.has(local.id)) continue;
    rows.push(local);
    seen.add(local.id);
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function rememberProject(project: Project) {
  saveProject(project);
  void saveOwnedProject({ data: project }).catch(() => undefined);
}

export function claimBrowserProjects(): Promise<void> {
  const rows = readAll();
  if (rows.length === 0) return Promise.resolve();
  return claimOwnedProjects({ data: rows }).then(() => undefined);
}

export async function removeProject(id: string): Promise<void> {
  writeAll(readAll().filter((project) => project.id !== id));
  await deleteOwnedProject({ data: id }).catch(() => undefined);
}

export function withAppMemory(html: string, data: Record<string, string>, projectId = ""): string {
  if (!html.trim()) return html;
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");
  const api = typeof window !== "undefined" ? window.location.origin : "";
  const boot = projectId ? `window.RUN_APP={id:${JSON.stringify(projectId)},api:${JSON.stringify(api)}};` : "";
  const script = `<script>(function(){${boot}var s=${payload};try{Object.keys(s).forEach(function(k){localStorage.setItem(k,s[k])})}catch(e){}function send(k,v){try{parent.postMessage({type:"run-store",key:k,value:v},"*")}catch(e){}}var put=localStorage.setItem.bind(localStorage);localStorage.setItem=function(k,v){put(k,v);send(k,String(v))};var cut=localStorage.removeItem.bind(localStorage);localStorage.removeItem=function(k){cut(k);send(k,null)}})()</script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (tag) => `${tag}${script}`) : script + html;
}

export function stampImages(html: string, images: string[]): string {
  let next = html;
  images.forEach((image, index) => {
    next = next.split(`RUN_IMG_${index + 1}`).join(image);
  });
  if (images[0] && !next.includes(images[0])) {
    next = next.replace(/https:\/\/picsum\.photos[^"'\s)]+/i, images[0]);
  }
  return next;
}

export function readCredits(): number {
  try {
    const raw = localStorage.getItem(CREDITS_KEY);
    if (raw == null) return 15;
    const next = Number(raw);
    if (!Number.isFinite(next)) return 15;
    return Math.max(0, Math.round(next * 10) / 10);
  } catch {
    return 15;
  }
}

export function readCreditCap(): number {
  const left = readCredits();
  try {
    const raw = Number(localStorage.getItem(CAP_KEY));
    if (Number.isFinite(raw) && raw >= left && raw > 0) return raw;
    const cap = Math.max(left, 15);
    localStorage.setItem(CAP_KEY, String(cap));
    return cap;
  } catch {
    return Math.max(left, 15);
  }
}
export function hasPaidPack(): boolean {
  try {
    return localStorage.getItem("run.paid") === "1";
  } catch {
    return false;
  }
}

export function mirrorLedger(credits: number, paid: boolean): void {
  try {
    localStorage.setItem(CREDITS_KEY, String(credits));
    localStorage.setItem("run.paid", paid ? "1" : "0");
    const cap = Math.max(credits, Number(localStorage.getItem(CAP_KEY)) || 0, 15);
    localStorage.setItem(CAP_KEY, String(cap));
  } catch {
    /* ignore */
  }
}

export function spendCredits(amount: number): number {
  const next = Math.max(0, Math.round((readCredits() - amount) * 10) / 10);
  localStorage.setItem(CREDITS_KEY, String(next));
  return next;
}
