export const CATEGORIES = [
  "AI Agents & Infrastructure",
  "AI Media Generation",
  "Analytics",
  "Audio, Voice & Podcasting",
  "Agencies, Studios & Services",
  "Business, Finance & Legal",
  "Crypto, Web3 & Investing",
  "Design & Creative",
  "Developer Tools",
  "Directories, Launch & Discovery",
  "Domains & Web Assets",
  "Education & Learning",
  "Games & Entertainment",
  "Health, Fitness & Wellness",
  "Hiring, Jobs & Careers",
  "Leaderboards & Attention Markets",
  "Marketing & Advertising",
  "Media & News",
  "People & Profiles",
  "Product Management",
  "Productivity & Personal Tools",
  "Real Estate & Property",
  "Sales & Lead Generation",
  "Security, Privacy & Compliance",
  "SEO & AI Visibility",
  "Social Media & Creator Tools",
  "Travel, Local & Lifestyle",
  "Writing & Content",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type ListingFilter = "All" | Category;
export type ListingSource = "hosted" | "external";
export type ListingVisibility = "live" | "unlisted";
export type ListingKind = "tool" | "website" | "agent";
export type ListingPrice = "free" | "paid";

export type Listing = {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
  category: Category;
  source: ListingSource;
  createdAt: string;
  lastRelistedAt: string | null;
  status: ListingVisibility;
  clicks: number;
  ownerId: string;
  ago?: string;
  preview?: { heading: string; button: string } | null;
  html?: string;
  kind?: ListingKind;
  price?: ListingPrice;
  amount?: number;
};

export type AppListing = {
  slug: string;
  name: string;
  blurb: string;
  category: Category;
  status: "Hosted" | "External";
  source: ListingSource;
  createdAt: string;
  lastRelistedAt: string | null;
  visibility: ListingVisibility;
  clicks: number;
  ownerId: string;
  ago?: string;
  image?: string;
  href?: string;
  kind: ListingKind;
  price: ListingPrice;
  amount: number;
};

export const SEEDS: Listing[] = [
  {
    id: "gst-calculator",
    title: "GST Calculator",
    description: "Calculate GST amount and total instantly.",
    image: "",
    url: "/t/gst-calculator",
    category: "Business, Finance & Legal",
    source: "hosted",
    createdAt: "2026-09-26T18:00:00.000Z",
    lastRelistedAt: null,
    status: "live",
    clicks: 1200,
    ownerId: "seed",
    ago: "2h ago",
  },
  {
    id: "emi-calculator",
    title: "EMI Calculator",
    description: "Calculate EMI, interest and total payable.",
    image: "",
    url: "/t/emi-calculator",
    category: "Business, Finance & Legal",
    source: "hosted",
    createdAt: "2026-09-25T18:00:00.000Z",
    lastRelistedAt: null,
    status: "live",
    clicks: 842,
    ownerId: "seed",
    ago: "4h ago",
  },
  {
    id: "invoice",
    title: "Invoice",
    description: "Create and download invoices in seconds.",
    image: "",
    url: "/t/invoice",
    category: "Productivity & Personal Tools",
    source: "hosted",
    createdAt: "2026-09-24T18:00:00.000Z",
    lastRelistedAt: null,
    status: "live",
    clicks: 512,
    ownerId: "seed",
    ago: "6h ago",
  },
  {
    id: "json-formatter",
    title: "JSON formatter",
    description: "Pretty-print or minify a JSON document.",
    image: "",
    url: "/t/json-formatter",
    category: "Developer Tools",
    source: "hosted",
    createdAt: "2026-09-23T18:00:00.000Z",
    lastRelistedAt: null,
    status: "live",
    clicks: 1544,
    ownerId: "seed",
  },
  {
    id: "quote-calculator",
    title: "Quote calculator",
    description: "Line items, a discount, and tax in one total.",
    image: "",
    url: "/t/quote-calculator",
    category: "Sales & Lead Generation",
    source: "hosted",
    createdAt: "2026-09-22T18:00:00.000Z",
    lastRelistedAt: null,
    status: "live",
    clicks: 890,
    ownerId: "seed",
  },
  {
    id: "contact-form",
    title: "Contact form",
    description: "A short contact form that opens elsewhere.",
    image: "",
    url: "https://tally.so",
    category: "Marketing & Advertising",
    source: "external",
    createdAt: "2026-09-21T18:00:00.000Z",
    lastRelistedAt: null,
    status: "live",
    clicks: 426,
    ownerId: "seed",
  },
];

export function hostedBySlug(slug: string): { slug: string; name: string } | null {
  const app = SEEDS.find((item) => item.id === slug && item.source === "hosted");
  return app ? { slug: app.id, name: app.title } : null;
}

export function postedAgo(iso: string, now = Date.now()): string {
  const hours = Math.floor(Math.max(0, now - Date.parse(iso)) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatClicks(count: number): string {
  if (count < 1000) return String(count);
  const scaled = count / 1000;
  const digits = scaled >= 10 ? 0 : 1;
  return `${scaled.toFixed(digits).replace(/\.0$/, "")}K`;
}

export function clicksLabel(count: number): string {
  if (count === 1) return "1 click";
  return `${formatClicks(count)} clicks`;
}

export function canonicalUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function sameProduct(a: Listing, ownerId: string, url: string): boolean {
  if (a.ownerId !== ownerId) return false;
  if (a.source === "hosted") return a.id === url;
  try {
    return canonicalUrl(a.url) === canonicalUrl(url);
  } catch {
    return a.url === url;
  }
}

export function compareRank(a: Listing, b: Listing): number {
  const aBottom = Boolean(a.lastRelistedAt);
  const bBottom = Boolean(b.lastRelistedAt);
  if (aBottom !== bBottom) return aBottom ? 1 : -1;
  if (!aBottom) return b.createdAt.localeCompare(a.createdAt);
  return (a.lastRelistedAt ?? "").localeCompare(b.lastRelistedAt ?? "");
}

export function toCard(listing: Listing): AppListing {
  return {
    slug: listing.id,
    name: listing.title,
    blurb: listing.description,
    category: listing.category,
    status: listing.source === "hosted" ? "Hosted" : "External",
    source: listing.source,
    createdAt: listing.createdAt,
    lastRelistedAt: listing.lastRelistedAt,
    visibility: listing.status,
    clicks: listing.clicks,
    ownerId: listing.ownerId,
    ago: listing.ago,
    image: listing.image || undefined,
    href: listing.source === "external" ? listing.url : undefined,
    kind: listing.kind ?? "tool",
    price: listing.price ?? "free",
    amount: listing.price === "paid" ? listing.amount ?? 0 : 0,
  };
}

export function visibleRanked(
  listings: Listing[],
  filter: ListingFilter,
  scores: Record<string, number> = {},
): AppListing[] {
  return listings
    .filter((item) => item.status === "live")
    .filter((item) => filter === "All" || item.category === filter)
    .sort((a, b) => {
      const aScore = scores[a.id];
      const bScore = scores[b.id];
      if (aScore != null && bScore != null && aScore !== bScore) return bScore - aScore;
      return compareRank(a, b);
    })
    .map(toCard);
}
