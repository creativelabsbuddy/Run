import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { creditCeiling, creditsUsed } from "@/lib/build-flow";

export const classifyBuild = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input as { brief: string; fileName: string; tail: string })
  .handler(async ({ data }) => {
    const { classify } = await import("./hosted.server");
    return classify(data);
  });

export const generateBuild = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input as { brief: string; fileName: string; html: string; chain?: "free" | "tiny" | "simple" | "medium" | "heavy"; credits?: number; paid?: boolean })
  .handler(async ({ data, context }) => {
    const { generate } = await import("./hosted.server");
    const { forceChain, readLedger, rememberLedger, spendCredits } = await import("../ledger.server");
    await rememberLedger(context.userId, { credits: Number(data.credits) || 0, paid: data.paid === true });
    const chain = await forceChain(context.userId, data.chain ?? "simple");
    const hold = creditCeiling(data.brief, Boolean(data.html));
    const before = await readLedger(context.userId);
    if (before.credits < hold) return { error: "credits" as const, credits: before.credits };
    try {
      const result = await generate({ ...data, chain });
      if ("error" in result) return { ...result, credits: before.credits };
      const credits = await spendCredits(context.userId, creditsUsed(data.brief, data.html, result.html));
      return { ...result, credits };
    } catch {
      const row = await readLedger(context.userId);
      return { error: "failed" as const, credits: row.credits };
    }
  });
