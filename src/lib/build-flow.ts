export type Tier = "simple" | "medium" | "heavy";
export type BuildStep = "audience" | "action" | "plan" | null;

export type ProjectBuild = {
  audience: string;
  action: string;
  step: BuildStep;
  pending: string;
  lastFailed: boolean;
  planFor: string;
};

export const emptyBuild = (): ProjectBuild => ({
  audience: "",
  action: "",
  step: null,
  pending: "",
  lastFailed: false,
  planFor: "",
});

export function creditCeiling(prompt: string, hasFile: boolean): number {
  if (!hasFile) return /image|photo|picture|banner/i.test(prompt) ? 2 : 1;
  if (looksHeavy(prompt)) return 1.2;
  if (/remove|delete|hata ?do|hatao/i.test(prompt)) return 0.9;
  if (prompt.trim().length > 200) return 0.9;
  return 0.5;
}

export function creditsUsed(prompt: string, before: string, after: string): number {
  const next = after.trim();
  const prev = before.trim();
  if (!next || next === prev) return 0;
  if (!prev) return /image|photo|picture|banner/i.test(prompt) && /<img\b|background-image\s*:/i.test(next) ? 2 : 1;
  if (looksHeavy(prompt) && looksHeavy(next)) return 1.2;
  if (/remove|delete|hata ?do|hatao/i.test(prompt) && next.length + 40 < prev.length) return 0.9;
  if (prompt.trim().length <= 200 || Math.abs(next.length - prev.length) < 2500) return 0.5;
  return 0.9;
}

export function looksHollow(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[.?!]/g, "");
  if (!t || t.length > 80 || looksHeavy(t)) return false;
  if (/(salon|shop|blog|portfolio|restaurant|invoice|school|doctor|gym|store|ke liye|for my)/.test(t)) {
    return false;
  }
  const words = t.split(/\s+/);
  return /(website|site|webpage|web site)/.test(t) && words.length <= 6;
}

export function looksHeavy(text: string): boolean {
  const plain = text
    .replace(/\b(no|without|not|nahi|nahin|mat|don'?t|do not)\s+(?:a |any |the )?(payment|razorpay|checkout|login|log in|sign in|signup|sign up|auth|database|db|supabase)\b/gi, " ")
    .replace(/\b(payment|razorpay|checkout|login|log in|sign in|signup|sign up|auth|database|db|supabase)\s+(nahi|nahin|mat|no|not|off|band)\b/gi, " ");
  return /(payment|razorpay|checkout|login|log in|sign in|signup|sign up|auth|database|\bdb\b|supabase)/i.test(plain);
}

export function looksSimpleEdit(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= 200 && !looksHeavy(t);
}

export function looksApproved(text: string): boolean {
  return /^(haan|ha+|yes|ok|okay|kar do|theek hai|thik hai|approve|bana do)\.?$/i.test(text.trim());
}

export type Route =
  | { type: "ask-audience"; pending: string }
  | { type: "ask-action"; audience: string; pending: string }
  | { type: "edit" }
  | { type: "hold" }
  | { type: "plan"; brief: string }
  | { type: "build"; tier: Tier; chain: Tier | "free"; brief: string }
  | { type: "classify"; brief: string; free: boolean };

export function routeLocal(input: {
  text: string;
  hasFile: boolean;
  free: boolean;
  build: ProjectBuild;
}): Route {
  const { text, hasFile, free, build } = input;
  if (build.step === "audience") {
    return { type: "ask-action", audience: text.trim(), pending: build.pending || text };
  }
  if (build.step === "action") {
    const next = { ...build, step: null as BuildStep, action: text.trim() };
    return { type: "classify", brief: withContext(build.pending || text, next), free };
  }
  if (build.step === "plan") {
    if (looksApproved(text)) {
      return { type: "build", tier: "heavy", chain: "heavy", brief: build.pending || text };
    }
    if (hasFile && looksSimpleEdit(text)) return { type: "edit" };
    return { type: "hold" };
  }
  if (hasFile && looksSimpleEdit(text)) return { type: "edit" };
  if (looksHollow(text) && !hasFile && !build.audience) return { type: "ask-audience", pending: text };
  if (looksHeavy(text)) {
    if (free) return { type: "build", tier: "simple", chain: "free", brief: text };
    if (build.planFor === text.trim()) return { type: "hold" };
    return { type: "plan", brief: text.trim() };
  }
  return { type: "classify", brief: withContext(text, build), free };
}

function withContext(text: string, build: ProjectBuild): string {
  const bits = [text.trim()];
  if (build.audience) bits.push(`For: ${build.audience}`);
  if (build.action) bits.push(`First action: ${build.action}`);
  return bits.join("\n");
}

const COLORS: Record<string, string> = {
  green: "#3dd68c",
  hara: "#3dd68c",
  blue: "#5b8cff",
  neela: "#5b8cff",
  red: "#ff5a6a",
  lal: "#ff5a6a",
  pink: "#ff7ab6",
  purple: "#8b6cff",
  white: "#f5f5f7",
  black: "#111111",
};

export function applySimpleEdit(html: string, text: string): string | null {
  if (!html) return null;
  if (/gradient|magenta|linear|radial/i.test(text)) return null;
  let next = html;
  const lower = text.toLowerCase();
  const named = Object.keys(COLORS).filter((name) => new RegExp(`\\b${name}\\b`, "i").test(lower));
  if (named.length === 1 && /colou?r|bg|background|rang/i.test(text)) {
    next = next.replace(/background(?:-color)?:[^;}"]+/i, `background:${COLORS[named[0]]}`);
  }
  const fromTo = text.match(/\bfrom\s+(.+?)\s+to\s+(.+)$/i);
  if (fromTo?.[1] && fromTo[2]) {
    const from = fromTo[1].trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const found = next.match(new RegExp(from, "i"));
    if (found?.[0]) next = next.replace(found[0], escapeEdit(fromTo[2].trim()));
  } else {
    const quoted = text.match(/["“']([^"”']{1,80})["”']/);
    if (quoted?.[1]) {
      const safe = escapeEdit(quoted[1]);
      if (/button/i.test(text)) next = next.replace(/(<a\b[^>]*>)[^<]*/, `$1${safe}`);
      else next = next.replace(/(<h1\b[^>]*>)[^<]*/, `$1${safe}`);
    }
  }
  return next === html ? null : next;
}

function escapeEdit(value: string): string {
  return value.replace(/[&<>]/g, (char) => (char === "&" ? "&" : char === "<" ? "<" : ">"));
}

export function fileTail(html: string): string {
  return html.split("\n").slice(-2).join("\n").slice(-240);
}
