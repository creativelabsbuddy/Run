import {
  CATEGORIES,
  SEEDS,
  canonicalUrl,
  sameProduct,
  type Category,
  type Listing,
  type ListingKind,
  type ListingPrice,
} from "@/lib/catalog";

const KEY = "run.liveLinks";
export const LINKS_EVENT = "run-links";

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

function asListing(raw: Partial<Listing> & { title?: string; url?: string }): Listing | null {
  if (!raw.url || !raw.title && !raw.id) return null;
  const title = raw.title || "Untitled";
  const url = raw.url;
  const category = raw.category && isCategory(raw.category) ? raw.category : "Other";
  return {
    id: raw.id || `link-${Date.now()}`,
    title,
    description: raw.description || "",
    image: raw.image || "",
    url,
    category,
    source: raw.source === "hosted" ? "hosted" : "external",
    createdAt: raw.createdAt || new Date().toISOString(),
    lastRelistedAt: raw.lastRelistedAt ?? null,
    status: raw.status === "unlisted" ? "unlisted" : "live",
    clicks: typeof raw.clicks === "number" ? raw.clicks : 0,
    ownerId: raw.ownerId || "you",
    preview: raw.preview?.heading ? raw.preview : null,
    html: typeof raw.html === "string" ? raw.html : "",
    kind: raw.kind === "website" || raw.kind === "agent" ? raw.kind : "tool",
    price: raw.price === "paid" ? "paid" : "free",
    amount: raw.price === "paid" && typeof raw.amount === "number" ? Math.max(0, Math.round(raw.amount)) : 0,
  };
}

export function loadUserListings(): Listing[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Listing>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const listing = asListing(item);
      return listing ? [listing] : [];
    });
  } catch {
    return [];
  }
}

function save(listings: Listing[]) {
  localStorage.setItem(KEY, JSON.stringify(listings));
  window.dispatchEvent(new Event(LINKS_EVENT));
}

export function allListings(): Listing[] {
  return [...loadUserListings(), ...SEEDS];
}

export function listProduct(input: {
  url: string;
  title: string;
  description: string;
  image: string;
  category: Category;
  kind: ListingKind;
  price: ListingPrice;
  amount?: number;
  ownerId: string;
}): { status: "listed" | "relisted"; id: string } {
  const url = canonicalUrl(input.url);
  const listings = loadUserListings();
  const amount = input.price === "paid" ? input.amount ?? 0 : 0;
  const existing = listings.find((item) => sameProduct(item, input.ownerId, url));
  if (existing) {
    existing.title = input.title;
    existing.description = input.description;
    existing.image = input.image;
    existing.category = input.category;
    existing.kind = input.kind;
    existing.price = input.price;
    existing.amount = amount;
    existing.url = url;
    existing.status = "live";
    existing.lastRelistedAt = new Date().toISOString();
    save(listings);
    return { status: "relisted", id: existing.id };
  }
  const id = `link-${Date.now()}`;
  listings.unshift({
    id,
    title: input.title,
    description: input.description,
    image: input.image,
    url,
    category: input.category,
    source: "external",
    createdAt: new Date().toISOString(),
    lastRelistedAt: null,
    status: "live",
    clicks: 0,
    ownerId: input.ownerId,
    kind: input.kind,
    price: input.price,
    amount,
  });
  save(listings);
  return { status: "listed", id };
}

export function findUserListing(id: string): Listing | null {
  return loadUserListings().find((item) => item.id === id) ?? null;
}

export function publishHosted(input: {
  projectId: string;
  title: string;
  description: string;
  image: string;
  category: Category;
  ownerId: string;
  preview: { heading: string; button: string } | null;
  html: string;
  kind: ListingKind;
  price: ListingPrice;
  amount?: number;
}): "listed" | "relisted" | "updated" {
  const listings = loadUserListings();
  const existing = listings.find((item) => item.id === input.projectId);
  if (existing) {
    const wasUnlisted = existing.status === "unlisted";
    existing.title = input.title;
    existing.description = input.description;
    existing.image = input.image;
    existing.category = input.category;
    existing.preview = input.preview;
    existing.html = input.html;
    existing.kind = input.kind;
    existing.price = input.price;
    existing.amount = input.price === "paid" ? input.amount ?? existing.amount ?? 0 : 0;
    existing.status = "live";
    if (wasUnlisted) existing.lastRelistedAt = new Date().toISOString();
    save(listings);
    return wasUnlisted ? "relisted" : "updated";
  }
  listings.unshift({
    id: input.projectId,
    title: input.title,
    description: input.description,
    image: input.image,
    url: `/p/${input.projectId}`,
    category: input.category,
    source: "hosted",
    createdAt: new Date().toISOString(),
    lastRelistedAt: null,
    status: "live",
    clicks: 0,
    ownerId: input.ownerId,
    preview: input.preview,
    html: input.html,
    kind: input.kind,
    price: input.price,
    amount: input.price === "paid" ? input.amount ?? 0 : 0,
  });
  save(listings);
  return "listed";
}

export function updateLiveListing(input: {
  projectId: string;
  preview: { heading: string; button: string } | null;
  title?: string;
  description?: string;
  image?: string;
  category?: Category;
  html?: string;
  kind?: ListingKind;
  price?: ListingPrice;
  amount?: number;
}): boolean {
  const listings = loadUserListings();
  const existing = listings.find((item) => item.id === input.projectId && item.status === "live");
  if (!existing) return false;
  if (input.title != null) existing.title = input.title;
  if (input.description != null) existing.description = input.description;
  if (input.image != null) existing.image = input.image;
  if (input.category != null) existing.category = input.category;
  existing.preview = input.preview;
  if (input.html != null) existing.html = input.html;
  if (input.kind != null) existing.kind = input.kind;
  if (input.price != null) existing.price = input.price;
  if (input.amount != null) existing.amount = input.amount;
  if (existing.price !== "paid") existing.amount = 0;
  save(listings);
  return true;
}

export function republishHosted(
  projectId: string,
  preview: { heading: string; button: string } | null,
  html = "",
  title?: string,
): void {
  const listings = loadUserListings();
  const existing = listings.find((item) => item.id === projectId);
  if (!existing) return;
  existing.status = "live";
  existing.lastRelistedAt = new Date().toISOString();
  existing.preview = preview;
  existing.html = html;
  if (title) existing.title = title;
  save(listings);
}

const CLICKS_KEY = "run.clicks";
export const CLICKS_EVENT = "run-clicks";

export function readClickMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CLICKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function recordOpen(id: string, base: number): number {
  const map = readClickMap();
  const next = (map[id] ?? base) + 1;
  map[id] = next;
  try {
    localStorage.setItem(CLICKS_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
  window.dispatchEvent(new Event(CLICKS_EVENT));
  return next;
}

export function unlistProduct(id: string, ownerId: string): void {
  const listings = loadUserListings();
  const item = listings.find((listing) => listing.id === id && listing.ownerId === ownerId);
  if (!item) return;
  item.status = "unlisted";
  save(listings);
}
