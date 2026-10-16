import { env } from "@/lib/env.server";
import { looksHeavy } from "@/lib/build-flow";

export type Chain = "free" | "tiny" | "simple" | "medium" | "heavy";

type Slot = { id: string; via: "openrouter" | "xai" };

const LUNA: Slot = { id: "openai/gpt-5.6-luna", via: "openrouter" };
const GEMINI: Slot = { id: "google/gemini-3.7-flash", via: "openrouter" };
const GROK: Slot = { id: "x-ai/grok-4.6", via: "openrouter" };
const CLASSIFIER: Slot = { id: "openai/gpt-4o-mini", via: "openrouter" };

const CHAINS: Record<Chain, Slot[]> = {
  free: [LUNA],
  tiny: [LUNA],
  simple: [GEMINI],
  medium: [GROK],
  heavy: [GROK],
};

function openRouterKey(): string | undefined {
  return env("OPENROUTER_API_KEY");
}

function hasKey(slot: Slot): boolean {
  return Boolean(slot.via === "xai" ? env("XAI_API_KEY") : openRouterKey());
}
function pick(chain: Chain): Slot | null {
  return CHAINS[chain].find(hasKey) ?? null;
}

function extractHtml(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence?.[1] && /<\/html>/i.test(fence[1])) text = fence[1].trim();
  else text = text.replace(/```(?:html)?/gi, "").trim();
  const start = text.search(/<!doctype html>|<html[\s>]/i);
  if (start === -1) return "";
  let doc = text.slice(start).trim();
  const end = doc.search(/<\/html>/i);
  if (end !== -1) doc = doc.slice(0, end + "</html>".length);
  else if (/<body[\s>]/i.test(doc) && doc.length > 400) doc = `${doc}\n</body></html>`;
  if (!/<body[\s>]/i.test(doc) || !/<\/html>/i.test(doc)) return "";
  return doc;
}

async function complete(slot: Slot, messages: { role: string; content: string }[], maxTokens: number): Promise<string> {
  const key = slot.via === "xai" ? env("XAI_API_KEY") : openRouterKey();
  if (!key) throw new Error("NO_KEY");
  const response = await fetch(
    slot.via === "xai" ? "https://api.x.ai/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(slot.via === "openrouter" ? { "HTTP-Referer": "https://run.app", "X-Title": "Run" } : {}),
      },
      signal: AbortSignal.timeout(maxTokens >= 10000 ? 45000 : maxTokens > 200 ? 25000 : 12000),
      body: JSON.stringify({
        model: slot.id,
        temperature: 0.2,
        max_tokens: maxTokens,
        ...(slot.via === "openrouter" && maxTokens > 200 ? { reasoning: { effort: "low" } } : {}),
        ...(slot.via === "xai" ? { reasoning_effort: "low" } : {}),
        messages,
      }),
    },
  );
  if (!response.ok) throw new Error("FAILED");
  const json = (await response.json()) as {
    choices?: { finish_reason?: string; message?: { content?: string | { text?: string }[] } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => (typeof part === "string" ? part : part?.text || "")).join("");
  return "";
}

export async function classify(input: {
  brief: string;
  fileName: string;
  tail: string;
}): Promise<{ tier: 1 | 2 | 3; task: string } | { error: "no-key" | "failed" }> {
  if (!hasKey(CLASSIFIER)) return { error: "no-key" };
  try {
    const text = await complete(
      CLASSIFIER,
      [
        {
          role: "system",
          content:
            'Understand what the user wants, in Hindi or English. Reply with JSON only, no code: {"tier":1,"task":"..."}. tier 1 is a small change to an existing page. tier 2 is a new website, landing page, or a fuller page. tier 3 is payment, login, or a database. task is only WHAT to make, in the user\'s own words: the names, the items, and the counts they asked for. Do not say how to design it, which layout to use, or how to code it. Under 40 words.',
        },
        {
          role: "user",
          content: `User said:\n${input.brief.slice(0, 800)}\nFile: ${input.fileName || "none"}\nTail:\n${input.tail.slice(0, 240)}`,
        },
      ],
      180,
    );
    const read = readJudgement(text, input.brief.trim());
    if (!read) return { error: "failed" };
    return read;
  } catch (error) {
    return { error: error instanceof Error && error.message === "NO_KEY" ? "no-key" : "failed" };
  }
}

function readJudgement(text: string, fallback: string): { tier: 1 | 2 | 3; task: string } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as { tier?: number; task?: string };
      const tier = Number(parsed.tier);
      if (tier === 1 || tier === 2 || tier === 3) {
        const task = String(parsed.task || fallback).replace(/\s+/g, " ").trim().slice(0, 400);
        return { tier: tier as 1 | 2 | 3, task: task || fallback };
      }
    } catch {
      /* the digit below is enough */
    }
  }
  const match = text.match(/[123]/);
  if (!match) return null;
  return { tier: Number(match[0]) as 1 | 2 | 3, task: fallback };
}

const WATCHES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80",
];

function withProductPhotos(html: string, brief: string): string {
  if (!/watch|घड़ी|ghadi/i.test(brief)) return html;
  let index = 0;
  return html.replace(/https:\/\/picsum\.photos[^"'\s)]+/gi, () => WATCHES[Math.min(index++, WATCHES.length - 1)] ?? WATCHES[0]);
}

export async function generate(input: {
  brief: string;
  fileName: string;
  html: string;
  chain?: Chain;
}): Promise<{ html: string; model: string } | { error: "no-key" | "failed" | "timeout" | "cut"; model?: string }> {
  const slot = pick(input.chain ?? "simple");
  if (!slot) return { error: "no-key" };
  const page = { ...input, full: input.chain === "medium" };
  const first = await writePage(slot, page);
  if (!("error" in first) || first.error === "cut" || first.error === "no-key" || slot.id === LUNA.id || page.full) return first;
  const luna = pick("free");
  if (!luna || luna.id === slot.id) return first;
  const second = await writePage(luna, input);
  return "error" in second ? first : second;
}

async function writePage(
  slot: Slot,
  input: { brief: string; fileName: string; html: string; full?: boolean },
): Promise<{ html: string; model: string } | { error: "no-key" | "failed" | "timeout" | "cut"; model?: string }> {
  const full = input.full === true;
  const file = input.html
    ? `Selected file ${input.fileName}:\n${input.html.slice(0, full ? 8000 : 4000)}`
    : "No file yet. Write the first page.";
  const members = looksHeavy(input.brief);
  const system = members
    ? "Return one complete HTML document only. No markdown. End with </html>. window.RUN_APP is already on the page. POST window.RUN_APP.api + '/api/apps/' + window.RUN_APP.id with JSON. signup and login send {action, email, password} and return {token}. Save the token and send Authorization: Bearer token. save sends {action:'save', order:{title, detail}}. list sends {action:'list'} and returns {orders:[{id, title, detail, at}]}. Show {error} text. After login, list only this member's orders. Do not keep orders only in the page. One page: login, a form, and the list."
    : full
      ? "Return one complete HTML document only. No markdown. End with </html>. Build a real website, not a single card. Include a top nav, a large hero, at least three content sections, and a footer. Use a full-page layout, clear type, spacing, and a palette that fits the subject. Use images.unsplash.com photo URLs when the subject needs pictures. Do not add login or payment."
      : "Return one complete HTML document only. No markdown. You decide the layout, colors, and type. Follow the request. Do not add login, payment, or extra pages. Keep it one short page and end with </html>.";
  const ask = async (extra: string, maxTokens: number) =>
    extractHtml(
      await complete(
        slot,
        [
          { role: "system", content: system },
          { role: "user", content: `${file}\n\nRequest:\n${input.brief}\n\n${extra}` },
        ],
        maxTokens,
      ),
    );
  try {
    let html = await ask(full ? "Write the full website. Several sections, not one card. Close every tag." : "Rewrite the page for this request. One page. Close every tag.", full ? 10000 : 8000);
    if (!html && !full) {
      html = await ask("The last reply was cut off. Write a shorter page, under 100 lines, and end with </html>.", 8000);
    }
    if (!html) return { error: "cut", model: slot.id };
    return { html: withProductPhotos(html, input.brief), model: slot.id };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (error instanceof Error && error.message === "NO_KEY") return { error: "no-key" };
    if (name === "TimeoutError" || name === "AbortError") return { error: "timeout", model: slot.id };
    return { error: "failed", model: slot.id };
  }
}
