import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

export const getLedger = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { readLedger } = await import("./ledger.server");
    return readLedger(context.userId);
  });

export const grantPack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { grantPack: grant } = await import("./ledger.server");
    return grant(context.userId);
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
