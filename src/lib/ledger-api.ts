import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

export const getLedger = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = (input ?? {}) as { credits?: number; paid?: boolean };
    const credits = Number(raw.credits);
    return {
      credits: Number.isFinite(credits) ? Math.max(0, Math.min(credits, 1000)) : 0,
      paid: raw.paid === true,
    };
  })
  .handler(async ({ context, data }) => {
    const { rememberLedger } = await import("./ledger.server");
    return rememberLedger(context.userId, data);
  });

export const grantPack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = (input ?? {}) as { credits?: number; paid?: boolean };
    const credits = Number(raw.credits);
    return {
      credits: Number.isFinite(credits) ? Math.max(0, Math.min(credits, 1000)) : 0,
      paid: raw.paid === true,
    };
  })
  .handler(async ({ context, data }) => {
    const { grantPack: grant } = await import("./ledger.server");
    return grant(context.userId, data);
  });

export const addTestMoney = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((rupees: number) => (rupees === 500 ? 500 : 100))
  .handler(async ({ context, data }) => {
    const { addTestMoney: add } = await import("./ledger.server");
    return add(context.userId, data);
  });

export const saveGate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: unknown) =>
      input as { id: string; price: "free" | "paid"; amount: number; source: "hosted" | "external"; url: string },
  )
  .handler(async ({ context, data }) => {
    if (!data?.id) return;
    const { saveGate: save } = await import("./ledger.server");
    await save(context.userId, data);
  });

export const purchaseListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id.trim())
  .handler(async ({ context, data }) => {
    const { purchaseListing: buy } = await import("./ledger.server");
    return buy(context.userId, data);
  });

export const revealListingUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id.trim())
  .handler(async ({ context, data }) => {
    const { revealUrl } = await import("./ledger.server");
    return revealUrl(context.userId, data);
  });
