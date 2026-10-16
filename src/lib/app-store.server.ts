import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";

type Body = { action?: string; email?: string; password?: string; order?: { title?: string; detail?: string } };

function id(): string {
  return randomBytes(12).toString("hex");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

function emailOf(value: unknown): string {
  return String(value || "").trim().toLowerCase().slice(0, 120);
}

export async function handleAppStore(
  projectId: string,
  body: Body,
  authorization: string | null,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const project = projectId.trim().slice(0, 80);
  if (!project) return { status: 400, body: { error: "Missing project" } };
  const sql = await getSql();
  const action = body.action;
  if (action === "signup" || action === "login") {
    const email = emailOf(body.email);
    const password = String(body.password || "");
    if (!email.includes("@") || password.length < 8) return { status: 400, body: { error: "Email and a password of 8 characters" } };
    if (action === "signup") {
      const taken = await sql<{ id: string }>`select id from app_members where project_id = ${project} and email = ${email} limit 1`;
      if (taken[0]) return { status: 400, body: { error: "Account already exists" } };
      const token = randomBytes(24).toString("hex");
      await sql`
        insert into app_members (id, project_id, email, password_hash, token)
        values (${id()}, ${project}, ${email}, ${hashPassword(password)}, ${token})
      `;
      return { status: 200, body: { token } };
    }
    const rows = await sql<{ password_hash: string; token: string }>`
      select password_hash, token from app_members where project_id = ${project} and email = ${email} limit 1
    `;
    const row = rows[0];
    if (!row || !checkPassword(password, row.password_hash)) return { status: 400, body: { error: "Email or password is wrong" } };
    return { status: 200, body: { token: row.token } };
  }
  const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, body: { error: "Sign in first" } };
  const members = await sql<{ id: string }>`
    select id from app_members where project_id = ${project} and token = ${token} limit 1
  `;
  const member = members[0];
  if (!member) return { status: 401, body: { error: "Sign in first" } };
  if (action === "save") {
    const title = String(body.order?.title || "").trim().slice(0, 120);
    const detail = String(body.order?.detail || "").trim().slice(0, 500);
    if (!title) return { status: 400, body: { error: "Order needs a title" } };
    const orderId = id();
    await sql`
      insert into app_orders (id, project_id, member_id, title, detail)
      values (${orderId}, ${project}, ${member.id}, ${title}, ${detail})
    `;
    return { status: 200, body: { id: orderId } };
  }
  if (action === "list") {
    const orders = await sql<{ id: string; title: string; detail: string; created_at: string }>`
      select id, title, detail, created_at from app_orders
      where project_id = ${project} and member_id = ${member.id}
      order by created_at desc
      limit 50
    `;
    return {
      status: 200,
      body: {
        orders: orders.map((order) => ({ id: order.id, title: order.title, detail: order.detail, at: order.created_at })),
      },
    };
  }
  return { status: 400, body: { error: "Unknown action" } };
}
