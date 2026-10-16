const COUNTS = "run.likes";
const MINE = "run.liked";

function readCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COUNTS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readMine(): string[] {
  try {
    const raw = localStorage.getItem(MINE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadLikeState(): { counts: Record<string, number>; mine: string[] } {
  return { counts: readCounts(), mine: readMine() };
}

export function toggleLike(slug: string): { counts: Record<string, number>; mine: string[] } {
  const counts = readCounts();
  const mine = new Set(readMine());
  if (mine.has(slug)) {
    mine.delete(slug);
    counts[slug] = Math.max(0, (counts[slug] ?? 1) - 1);
  } else {
    mine.add(slug);
    counts[slug] = (counts[slug] ?? 0) + 1;
  }
  const nextMine = [...mine];
  try {
    localStorage.setItem(COUNTS, JSON.stringify(counts));
    localStorage.setItem(MINE, JSON.stringify(nextMine));
  } catch {
    /* ignore quota */
  }
  return { counts, mine: nextMine };
}
