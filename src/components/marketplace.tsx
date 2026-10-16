import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { Flame, Heart, Search, SlidersHorizontal, X } from "lucide-react";
import {
  CATEGORIES,
  clicksLabel,
  postedAgo,
  visibleRanked,
  type AppListing,
  type ListingFilter,
} from "@/lib/catalog";
import { AppFrame } from "@/components/chrome";
import { AppPreview } from "@/components/previews";
import { CLICKS_EVENT, LINKS_EVENT, allListings, readClickMap, recordOpen, unlistProduct } from "@/lib/live-links";
import { loadLikeState, toggleLike } from "@/lib/likes";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { BuySheet } from "@/components/buy-sheet";
import { ownsListing, WALLET_EVENT } from "@/lib/wallet";
import { revealListingUrl } from "@/lib/ledger-api";

export function Marketplace() {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<ListingFilter>("All");
  const [kind, setKind] = useState<"all" | "tool" | "website" | "agent">("all");
  const [price, setPrice] = useState<"all" | "free" | "paid">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listed, setListed] = useState<AppListing[]>([]);
  const user = useCurrentUser();
  const ownerId = user?.id ?? null;
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [clickMap, setClickMap] = useState<Record<string, number>>({});
  const [buying, setBuying] = useState<AppListing | null>(null);

  useEffect(() => {
    function sync() {
      setListed(visibleRanked(allListings(), "All"));
    }
    function syncClicks() {
      setClickMap(readClickMap());
    }
    sync();
    syncClicks();
    const saved = loadLikeState();
    setLikes(saved.counts);
    setMine(saved.mine);
    window.addEventListener(LINKS_EVENT, sync);
    window.addEventListener(CLICKS_EVENT, syncClicks);
    window.addEventListener(WALLET_EVENT, sync);
    return () => {
      window.removeEventListener(LINKS_EVENT, sync);
      window.removeEventListener(CLICKS_EVENT, syncClicks);
      window.removeEventListener(WALLET_EVENT, sync);
    };
  }, []);

  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listed
      .filter((app) => {
        if (chip !== "All" && app.category !== chip) return false;
        if (q && !`${app.name} ${app.blurb}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .map((app, index) => ({ app, rank: index + 1 }));
  }, [chip, listed, query]);

  const items = ranked
    .filter(({ app }) => {
      if (kind !== "all" && app.kind !== kind) return false;
      if (price !== "all" && app.price !== price) return false;
      return true;
    })
    .map(({ app, rank }) => {
      const unlocked = Boolean(ownerId && (ownerId === app.ownerId || ownsListing(ownerId, app.slug)));
      const safe = app.price === "paid" && app.amount > 0 && !unlocked ? { ...app, href: undefined } : app;
      return { app: safe, rank, unlocked };
    });

  const maxClicks = items.reduce((max, item) => Math.max(max, clickMap[item.app.slug] ?? item.app.clicks), 0);
  const maxLikes = items.reduce((max, item) => Math.max(max, likes[item.app.slug] ?? 0), 0);

  function onLike(slug: string) {
    const next = toggleLike(slug);
    setLikes(next.counts);
    setMine(next.mine);
  }

  return (
    <AppFrame mode="market">
      <main className="mx-auto w-full max-w-2xl px-4 pt-6 pb-safe">
        <header className="relative">
          <div className="title-glow" aria-hidden="true" />
          <div className="relative">
            <h1 className="text-5xl font-semibold tracking-tight text-fg">Running</h1>
            <p className="mt-1 inline-flex flex-col">
              <span className="text-5xl font-semibold tracking-tight grad-text">live</span>
              <span className="grad-line mt-1" aria-hidden="true" />
            </p>
            <p className="mt-4 text-base text-muted">Apps and agents. Open now.</p>
          </div>
        </header>

        <div className="mt-8 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              type="text"
              inputMode="search"
              enterKeyHint="search"
              aria-label="Search"
              placeholder="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 w-full rounded-full bg-input pr-3 pl-9 text-base text-fg outline-none ring-1 ring-inset ring-line placeholder:text-muted focus-visible:ring-line-strong"
            />
          </div>
          <button
            type="button"
            aria-label="Filter"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(true)}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-input text-fg ring-1 ring-inset ring-line"
          >
            <SlidersHorizontal className="size-4" strokeWidth={1.75} />
          </button>
        </div>
        <div
          role="tablist"
          aria-label="Categories"
          className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 py-1"
        >
          {(["All", ...CATEGORIES] as const).map((item) => {
            const selected = item === chip;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setChip(item)}
                className={
                  selected
                    ? "h-8 shrink-0 rounded-full px-3 text-xs font-medium whitespace-nowrap grad-fill"
                    : "h-8 shrink-0 rounded-full px-3 text-xs whitespace-nowrap text-fg ring-1 ring-line"
                }
              >
                {item}
              </button>
            );
          })}
        </div>

        {items.length === 0 ? (
          <p className="py-24 text-center text-base text-muted">Nothing live yet.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-4" aria-label="Live apps">
            {items.map(({ app, rank, unlocked }) => (
              <li key={app.slug}>
                <FeedCard
                  app={app}
                  rank={rank}
                  likes={likes[app.slug] ?? 0}
                  liked={mine.includes(app.slug)}
                  hot={
                    (maxClicks > 0 && (clickMap[app.slug] ?? app.clicks) === maxClicks) ||
                    (maxLikes > 0 && (likes[app.slug] ?? 0) === maxLikes)
                  }
                  onLike={() => onLike(app.slug)}
                  owned={ownerId !== null && app.ownerId === ownerId}
                  onUnlist={() => unlistProduct(app.slug, ownerId || "")}
                  clicks={clickMap[app.slug] ?? app.clicks}
                  onOpen={() => recordOpen(app.slug, clickMap[app.slug] ?? app.clicks)}
                  unlocked={unlocked}
                  onBuy={() => setBuying(app)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
      {filtersOpen ? (
        <FilterSheet kind={kind} price={price} onKind={setKind} onPrice={setPrice} onClose={() => setFiltersOpen(false)} />
      ) : null}
      {buying ? (
        <BuySheet
          buyerId={ownerId}
          listingId={buying.slug}
          sellerId={buying.ownerId}
          title={buying.name}
          amount={buying.amount}
          onClose={() => setBuying(null)}
          onBought={() => {
            const slug = buying.slug;
            setBuying(null);
            setClickMap(readClickMap());
            const card = listed.find((item) => item.slug === slug);
            if (card?.source === "external") {
              void revealListingUrl({ data: slug }).then((url) => {
                if (url) window.open(url, "_blank", "noopener,noreferrer");
              });
              return;
            }
            window.location.assign(`/t/${slug}`);
          }}
        />
      ) : null}
    </AppFrame>
  );
}

function FilterSheet({
  kind,
  price,
  onKind,
  onPrice,
  onClose,
}: {
  kind: "all" | "tool" | "website" | "agent";
  price: "all" | "free" | "paid";
  onKind: (value: "all" | "tool" | "website" | "agent") => void;
  onPrice: (value: "all" | "free" | "paid") => void;
  onClose: () => void;
}) {
  const types = [
    ["all", "All"],
    ["tool", "Tools"],
    ["website", "Websites"],
    ["agent", "Agents"],
  ] as const;
  const prices = [
    ["all", "All"],
    ["free", "Free"],
    ["paid", "Paid"],
  ] as const;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-card px-4 pt-4 pb-safe">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filter</h2>
          <button type="button" aria-label="Close sheet" onClick={onClose} className="grid size-11 place-items-center text-muted">
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">Type</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {types.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onKind(id)}
              className={id === kind ? "h-9 rounded-full px-3 text-sm grad-fill" : "h-9 rounded-full px-3 text-sm ring-1 ring-line"}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">Price</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {prices.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onPrice(id)}
              className={id === price ? "h-9 rounded-full px-3 text-sm grad-fill" : "h-9 rounded-full px-3 text-sm ring-1 ring-line"}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FeedCard({
  app,
  rank,
  likes,
  liked,
  hot,
  onLike,
  owned,
  onUnlist,
  clicks,
  onOpen,
  unlocked,
  onBuy,
}: {
  app: AppListing;
  rank: number;
  likes: number;
  liked: boolean;
  hot: boolean;
  onLike: () => void;
  owned: boolean;
  onUnlist: () => void;
  clicks: number;
  onOpen: () => void;
  unlocked: boolean;
  onBuy: () => void;
}) {
  const rankClass = rank === 1 ? "feed-card-1" : rank === 2 ? "feed-card-2" : rank === 3 ? "feed-card-3" : "";
  const useClass =
    rank === 1
      ? "inline-flex h-9 min-w-28 items-center justify-center rounded-lg px-5 text-sm font-medium grad-fill"
      : "inline-flex h-9 min-w-28 items-center justify-center rounded-lg px-5 text-sm font-medium text-fg ring-1 ring-white/15";

  return (
    <article className={`feed-card flex items-stretch gap-2.5 ${rankClass}`}>
      <div className="card-shot select-none" aria-hidden="true">
        {app.image ? (
          <img src={app.image} alt="" />
        ) : (
          <AppPreview slug={app.slug} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5 pr-0.5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="truncate text-[15px] font-semibold leading-tight">{app.name}</h2>
          <span className="flex shrink-0 items-center gap-1">
            {hot ? <Flame className="size-4 text-orange-400" aria-label="Hot" /> : null}
            {rank <= 3 ? (
              <span className={rank === 1 ? "rank-pip grad-fill" : "rank-pip rank-pip-muted"}>#{rank}</span>
            ) : null}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-muted">{app.blurb}</p>
        <p className="mt-1 flex items-center gap-2 text-[11px] text-muted tabular-nums">
          <span className="min-w-0 truncate">
            {app.ago ?? postedAgo(app.createdAt)} · {clicksLabel(clicks)}
          </span>
          {owned ? (
            <button type="button" onClick={onUnlist} className="shrink-0 text-[11px] text-fg">
              Unlist
            </button>
          ) : null}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
            onClick={onLike}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-1 text-sm text-fg"
          >
            <Heart className={liked ? "size-4 fill-current" : "size-4"} strokeWidth={1.75} />
            <span className="text-xs text-muted tabular-nums">{likes}</span>
          </button>
          <UseControl app={app} className={useClass} unlocked={unlocked} onOpen={onOpen} onBuy={onBuy} />
        </div>
      </div>
    </article>
  );
}

function UseControl({
  app,
  className,
  unlocked,
  onOpen,
  onBuy,
}: {
  app: AppListing;
  className: string;
  unlocked: boolean;
  onOpen: () => void;
  onBuy: () => void;
}) {
  const paid = app.price === "paid" && app.amount > 0 && !unlocked;
  if (paid) {
    return (
      <button type="button" className={className} onClick={onBuy}>
        Buy ₹{app.amount}
        <span className="sr-only"> {app.name}</span>
      </button>
    );
  }
  if (app.source === "external" && app.href) {
    return (
      <a href={app.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onOpen}>
        Try now
        <span className="sr-only"> {app.name}, opens in a new tab.</span>
      </a>
    );
  }
  return (
    <Link to="/t/$slug" params={{ slug: app.slug }} className={className} onClick={onOpen}>
      Try now
      <span className="sr-only"> {app.name}</span>
    </Link>
  );
}
