import { getSql } from "@/lib/db";

type Chain = "free" | "tiny" | "simple" | "medium" | "heavy";

export type LedgerRow = {
  credits: number;
  paid: boolean;
  balance: number;
  earnings: number;
  owned: string[];
};

type Raw = { credits: number | string; paid: number | string; balance: number | string; earnings: number | string };

function num(value: number | string): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

async function readOwned(userId: string): Promise<string[]> {
  const sql = await getSql();
  const rows = await sql<{ listing_id: string }>`select listing_id from purchases where buyer_id = ${userId}`;
  return rows.map((row) => row.listing_id);
}

export async function readLedger(userId: string): Promise<LedgerRow> {
  const sql = await getSql();
  await sql`insert into ledger (user_id) values (${userId}) on conflict (user_id) do nothing`;
  const rows = await sql<Raw>`select credits, paid, balance, earnings from ledger where user_id = ${userId}`;
  const row = rows[0];
  return {
    credits: Math.round(num(row?.credits ?? 15) * 10) / 10,
    paid: num(row?.paid ?? 0) === 1,
    balance: Math.round(num(row?.balance ?? 0)),
    earnings: Math.round(num(row?.earnings ?? 0)),
    owned: await readOwned(userId),
  };
}

/** A new server has an empty ledger. Keep the Pro balance the browser already has. */
export async function rememberLedger(
  userId: string,
  hint: { credits: number; paid: boolean },
): Promise<LedgerRow> {
  const row = await readLedger(userId);
  const fresh = !row.paid && row.credits <= 15 && row.balance === 0 && row.earnings === 0;
  const credits = Math.round(Math.min(Math.max(hint.credits, 0), 1000) * 10) / 10;
  if (fresh && hint.paid && credits > row.credits) {
    const sql = await getSql();
    await sql`update ledger set credits = ${credits}, paid = 1 where user_id = ${userId}`;
    return readLedger(userId);
  }
  return row;
}

export async function grantPack(userId: string, hint?: { credits: number; paid: boolean }): Promise<LedgerRow> {
  const sql = await getSql();
  if (hint?.paid) await rememberLedger(userId, hint);
  else await readLedger(userId);
  await sql`update ledger set credits = credits + 120, paid = 1 where user_id = ${userId}`;
  return readLedger(userId);
}

export async function addTestMoney(userId: string, rupees: number): Promise<LedgerRow> {
  const sql = await getSql();
  const amount = rupees === 500 ? 500 : 100;
  await readLedger(userId);
  await sql`update ledger set balance = balance + ${amount} where user_id = ${userId}`;
  return readLedger(userId);
}

export async function forceChain(userId: string, chain: Chain): Promise<Chain> {
  const row = await readLedger(userId);
  if (row.paid) return chain;
  return chain === "tiny" ? "tiny" : "free";
}

export async function spendCredits(userId: string, cost: number): Promise<number> {
  const amount = Math.max(0, Math.round(cost * 10) / 10);
  if (amount === 0) return (await readLedger(userId)).credits;
  const sql = await getSql();
  await readLedger(userId);
  const rows = await sql<{ credits: number | string }>`
    update ledger set credits = round((credits - ${amount})::numeric, 1)
    where user_id = ${userId} and credits >= ${amount}
    returning credits
  `;
  if (!rows[0]) return (await readLedger(userId)).credits;
  return Number(rows[0].credits);
}

export async function refundCredits(userId: string, hold: number): Promise<number> {
  const sql = await getSql();
  await sql`update ledger set credits = round((credits + ${hold})::numeric, 1) where user_id = ${userId}`;
  return (await readLedger(userId)).credits;
}

export async function settleCredits(userId: string, hold: number, cost: number): Promise<number> {
  const refund = Math.max(0, Math.round((hold - cost) * 10) / 10);
  if (refund > 0) await refundCredits(userId, refund);
  return (await readLedger(userId)).credits;
}

export async function saveGate(
  userId: string,
  input: { id: string; price: "free" | "paid"; amount: number; source: "hosted" | "external"; url: string },
): Promise<void> {
  const sql = await getSql();
  const amount = input.price === "paid" ? Math.max(0, Math.round(input.amount)) : 0;
  const price = amount >= 1 ? "paid" : "free";
  const url = input.source === "external" ? input.url.slice(0, 2000) : "";
  const existing = await sql<{ owner_id: string }>`select owner_id from gates where id = ${input.id} limit 1`;
  if (existing[0] && existing[0].owner_id !== userId) return;
  await sql`
    insert into gates (id, owner_id, price, amount, source, url)
    values (${input.id}, ${userId}, ${price}, ${amount}, ${input.source}, ${url})
    on conflict (id) do update set price = ${price}, amount = ${amount}, source = ${input.source}, url = ${url}
  `;
}

export async function purchaseListing(
  buyerId: string,
  listingId: string,
): Promise<{ ok: true; ledger: LedgerRow } | { ok: false; reason: "short" | "missing"; ledger: LedgerRow }> {
  const sql = await getSql();
  const gates = await sql<{ owner_id: string; price: string; amount: number | string; source: string }>`
    select owner_id, price, amount, source from gates where id = ${listingId} limit 1
  `;
  const gate = gates[0];
  const ledger = await readLedger(buyerId);
  if (!gate || gate.price !== "paid" || num(gate.amount) < 1 || gate.owner_id === buyerId) {
    return { ok: true, ledger };
  }
  const owned = await sql`select 1 from purchases where buyer_id = ${buyerId} and listing_id = ${listingId} limit 1`;
  if (owned.length > 0) return { ok: true, ledger };
  const amount = Math.round(num(gate.amount));
  const paid = await sql`
    update ledger set balance = balance - ${amount}
    where user_id = ${buyerId} and balance >= ${amount}
    returning balance
  `;
  if (!paid[0]) return { ok: false, reason: "short", ledger: await readLedger(buyerId) };
  const sellerCut = Math.round(amount * 0.9);
  await readLedger(gate.owner_id);
  await sql`update ledger set earnings = earnings + ${sellerCut} where user_id = ${gate.owner_id}`;
  await sql`
    insert into purchases (buyer_id, listing_id, seller_id, amount, created_at)
    values (${buyerId}, ${listingId}, ${gate.owner_id}, ${amount}, ${new Date().toISOString()})
    on conflict (buyer_id, listing_id) do nothing
  `;
  return { ok: true, ledger: await readLedger(buyerId) };
}

export async function sharedAccess(
  viewerId: string | null,
  id: string,
): Promise<{ open: true } | { open: false; title: string; amount: number; ownerId: string }> {
  const sql = await getSql();
  const gates = await sql<{ owner_id: string; price: string; amount: number | string }>`
    select owner_id, price, amount from gates where id = ${id} limit 1
  `;
  const gate = gates[0];
  if (!gate || gate.price !== "paid" || num(gate.amount) < 1) return { open: true };
  if (viewerId && viewerId === gate.owner_id) return { open: true };
  if (viewerId) {
    const owned = await sql`select 1 from purchases where buyer_id = ${viewerId} and listing_id = ${id} limit 1`;
    if (owned.length > 0) return { open: true };
  }
  const titles = await sql<{ title: string }>`select title from projects where id = ${id} limit 1`;
  return { open: false, title: titles[0]?.title || "Paid", amount: Math.round(num(gate.amount)), ownerId: gate.owner_id };
}

export async function revealUrl(userId: string, listingId: string): Promise<string | null> {
  const sql = await getSql();
  const gates = await sql<{ owner_id: string; url: string; price: string; amount: number | string }>`
    select owner_id, url, price, amount from gates where id = ${listingId} limit 1
  `;
  const gate = gates[0];
  if (!gate?.url) return null;
  if (gate.owner_id === userId) return gate.url;
  if (gate.price !== "paid" || num(gate.amount) < 1) return gate.url;
  const owned = await sql`select 1 from purchases where buyer_id = ${userId} and listing_id = ${listingId} limit 1`;
  return owned.length > 0 ? gate.url : null;
}
