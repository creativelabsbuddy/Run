import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { emptyBuild, type ProjectBuild } from "@/lib/build-flow";
import type { Project, ProjectMsg, ProjectPreview, ProjectUndo, ProjectVersion } from "@/lib/projects";

type Row = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  html: string;
  messages: string;
  preview: string | null;
  versions: string;
  build: string;
  meta: string | null;
  updated_at: string | Date;
};

type Meta = {
  workspaceId?: string;
  appData?: Record<string, string>;
  undo?: ProjectUndo | null;
  assets?: string[];
};

function stamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function asJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toProject(row: Row): Project {
  const preview = asJson<ProjectPreview | null>(row.preview, null);
  const meta = asJson<Meta>(row.meta, {});
  return {
    id: row.id,
    ownerId: row.user_id,
    prompt: row.prompt,
    title: row.title,
    updatedAt: stamp(row.updated_at),
    messages: asJson<ProjectMsg[]>(row.messages, []),
    html: row.html,
    preview: preview?.heading ? preview : null,
    versions: asJson<ProjectVersion[]>(row.versions, []),
    build: { ...emptyBuild(), ...asJson<Partial<ProjectBuild>>(row.build, {}) },
    workspaceId: meta.workspaceId || "personal",
    appData: meta.appData && typeof meta.appData === "object" ? meta.appData : {},
    undo: meta.undo?.html ? { html: meta.undo.html } : null,
    assets: Array.isArray(meta.assets) ? meta.assets.filter((asset) => typeof asset === "string").slice(0, 3) : [],
  };
}

function packMeta(data: Project): string {
  return JSON.stringify({
    workspaceId: data.workspaceId || "personal",
    appData: data.appData || {},
    undo: data.undo?.html ? { html: data.undo.html.slice(0, 500000) } : null,
    assets: (data.assets || []).slice(0, 3),
  });
}

async function sqlClient() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

export const listOwnedProjects = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await sqlClient();
    const rows = await sql<Row>`select id, user_id, title, prompt, html, messages, preview, versions, build, meta, updated_at from projects where user_id = ${context.userId} order by updated_at desc`;
    return rows.map(toProject);
  });

export const getOwnedProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id.trim())
  .handler(async ({ context, data: id }) => {
    if (!id) return null;
    const sql = await sqlClient();
    const rows = await sql<Row>`select id, user_id, title, prompt, html, messages, preview, versions, build, meta, updated_at from projects where id = ${id} and user_id = ${context.userId} limit 1`;
    return rows[0] ? toProject(rows[0]) : null;
  });

export const createOwnedProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { prompt: string; workspaceId?: string }) => ({
    prompt: input.prompt.trim().slice(0, 4000),
    workspaceId: (input.workspaceId || "personal").slice(0, 40),
  }))
  .handler(async ({ context, data }) => {
    if (!data.prompt) return "";
    const sql = await sqlClient();
    const id = `project-${Date.now()}`;
    const title = data.prompt.split(/[.\n]/)[0]?.trim().slice(0, 36) || data.prompt.slice(0, 36);
    const now = new Date().toISOString();
    const meta = JSON.stringify({ workspaceId: data.workspaceId, appData: {}, undo: null, assets: [] });
    await sql`insert into projects (id, user_id, title, prompt, html, messages, preview, versions, build, meta, updated_at) values (${id}, ${context.userId}, ${title}, ${data.prompt}, ${""}, ${"[]"}, ${null}, ${"[]"}, ${JSON.stringify(emptyBuild())}, ${meta}, ${now})`;
    return id;
  });

export const saveOwnedProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Project) => input)
  .handler(async ({ context, data }) => {
    if (!data?.id) return;
    const sql = await sqlClient();
    const title = (data.title || data.prompt || "Untitled").slice(0, 80);
    const prompt = (data.prompt || title).slice(0, 4000);
    const html = (data.html || "").slice(0, 500000);
    const now = data.updatedAt || new Date().toISOString();
    const meta = packMeta(data);
    await sql`
      insert into projects (id, user_id, title, prompt, html, messages, preview, versions, build, meta, updated_at)
      values (
        ${data.id},
        ${context.userId},
        ${title},
        ${prompt},
        ${html},
        ${JSON.stringify(data.messages ?? [])},
        ${data.preview ? JSON.stringify(data.preview) : null},
        ${JSON.stringify(data.versions ?? [])},
        ${JSON.stringify(data.build ?? emptyBuild())},
        ${meta},
        ${now}
      )
      on conflict (id) do update set
        title = excluded.title,
        prompt = excluded.prompt,
        html = excluded.html,
        messages = excluded.messages,
        preview = excluded.preview,
        versions = excluded.versions,
        build = excluded.build,
        meta = excluded.meta,
        updated_at = excluded.updated_at
      where projects.user_id = ${context.userId}
    `;
  });

export const claimOwnedProjects = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((rows: Project[]) => (Array.isArray(rows) ? rows.slice(0, 30) : []))
  .handler(async ({ context, data }) => {
    const sql = await sqlClient();
    for (const row of data) {
      if (!row?.id) continue;
      const existing = await sql<{ user_id: string }>`select user_id from projects where id = ${row.id} limit 1`;
      if (existing.length > 0) continue;
      const meta = packMeta(row);
      await sql`
        insert into projects (id, user_id, title, prompt, html, messages, preview, versions, build, meta, updated_at)
        values (
          ${row.id},
          ${context.userId},
          ${(row.title || row.prompt || "Untitled").slice(0, 80)},
          ${(row.prompt || row.title || "Untitled").slice(0, 4000)},
          ${(row.html || "").slice(0, 500000)},
          ${JSON.stringify(row.messages ?? [])},
          ${row.preview ? JSON.stringify(row.preview) : null},
          ${JSON.stringify(row.versions ?? [])},
          ${JSON.stringify(row.build ?? emptyBuild())},
          ${meta},
          ${row.updatedAt || new Date().toISOString()}
        )
      `;
    }
  });

export const deleteOwnedProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id.trim())
  .handler(async ({ context, data: id }) => {
    if (!id) return;
    const sql = await sqlClient();
    await sql`delete from projects where id = ${id} and user_id = ${context.userId}`;
  });

const viewerMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { authConfigured, DEV_USER_ID, getSessionUser } = await import("@/lib/auth/verify.server");
    const { gateIdentityEnabled } = await import("@/lib/auth/gate-identity.server");
    const userId: string | null =
      !authConfigured && !gateIdentityEnabled() ? DEV_USER_ID : ((await getSessionUser(context.bearerToken))?.id ?? null);
    return next({ context: { userId } });
  });

export const getSharedProject = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .validator((id: string) => id.trim())
  .handler(async ({ data: id, context }) => {
    if (!id) return null;
    const { sharedAccess } = await import("@/lib/ledger.server");
    const access = await sharedAccess(context.userId, id);
    if (!access.open) return { locked: true as const, title: access.title, amount: access.amount, ownerId: access.ownerId };
    const sql = await sqlClient();
    const rows = await sql<{ title: string; html: string }>`select title, html from projects where id = ${id} limit 1`;
    const row = rows[0];
    if (!row?.html?.trim()) return null;
    return { locked: false as const, title: row.title, html: row.html };
  });
