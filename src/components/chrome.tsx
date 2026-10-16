import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Grip, Hammer, Plus } from "lucide-react";
import { AccountSlot } from "@/components/account-slot";
import { AddLinkSheet } from "@/components/add-link-sheet";

type Mode = "market" | "builder" | "tool" | "editor" | "projects";

const iconClass =
  "grid size-11 place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-card hover:text-fg";

const sideOn = "grid size-8 place-items-center rounded-lg bg-fg text-bg";
const sideOff = "grid size-8 place-items-center rounded-lg text-fg ring-1 ring-line";

export function AppFrame({
  mode,
  onPublish,
  publishLabel = "Publish",
  onEditListing,
  credits,
  children,
}: {
  mode: Mode;
  onPublish?: () => void;
  publishLabel?: string;
  onEditListing?: () => void;
  credits?: number;
  children: ReactNode;
}) {
  const locked = mode === "builder" || mode === "editor";
  return (
    <div className={locked ? "flex h-dvh flex-col overflow-hidden" : "relative min-h-dvh"}>
      {mode === "market" ? null : <div className="atmosphere" aria-hidden="true" />}
      <div className={locked ? "relative z-10 flex min-h-0 flex-1 flex-col" : "relative z-10"}>
        <TopBar
          mode={mode}
          onPublish={onPublish}
          publishLabel={publishLabel}
          onEditListing={onEditListing}
          credits={credits}
        />
        {children}
      </div>
    </div>
  );
}

export function ToolFrame({
  name,
  wide = false,
  children,
}: {
  name: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <AppFrame mode="tool">
      <main className={`mx-auto w-full px-4 pb-safe pt-6 ${wide ? "max-w-5xl" : "max-w-lg"}`}>
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-1 text-sm text-muted">Hosted</p>
        <div className="mt-8">{children}</div>
      </main>
    </AppFrame>
  );
}

function TopBar({
  mode,
  onPublish,
  publishLabel,
  onEditListing,
  credits,
}: {
  mode: Mode;
  onPublish?: () => void;
  publishLabel?: string;
  onEditListing?: () => void;
  credits?: number;
}) {
  const [sheet, setSheet] = useState(false);
  const builderSide = mode === "builder" || mode === "editor" || mode === "projects";

  function onPlus() {
    setSheet(true);
  }

  return (
    <header className="topbar sticky top-0 z-30 bg-bg/80 backdrop-blur-md">
      <div className="relative flex h-14 items-center px-3">
        <div className="z-10 flex flex-1 items-center">
          {mode === "tool" ? (
            <Link to="/" aria-label="Back" className={iconClass}>
              <ChevronLeft className="size-5" strokeWidth={1.75} />
            </Link>
          ) : (
            <div
              role="group"
              aria-label="Marketplace or builder"
              className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-input p-0.5 ring-1 ring-line"
            >
              <Link
                to="/"
                aria-label="Marketplace"
                aria-current={mode === "market" ? "page" : undefined}
                className={mode === "market" ? sideOn : sideOff}
              >
                <Grip className="size-4" strokeWidth={1.75} />
              </Link>
              <Link
                to="/build"
                aria-label="Builder"
                aria-current={builderSide ? "page" : undefined}
                className={builderSide ? sideOn : sideOff}
              >
                <Hammer className="size-4" strokeWidth={1.75} />
              </Link>
            </div>
          )}
        </div>
        <Link
          to="/"
          className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-base font-semibold tracking-tight text-fg"
        >
          Run
        </Link>
        <div className="z-10 flex flex-1 items-center justify-end gap-2">
          {mode === "editor" ? (
            <>
              <p className="text-xs whitespace-nowrap text-muted tabular-nums">
                <span className="font-medium text-fg">{credits ?? "–"}</span> credits
              </p>
              <button
                type="button"
                onClick={onPublish}
                className="h-9 rounded-full bg-fg px-3 text-sm font-medium text-bg"
              >
                {publishLabel}
              </button>
            </>
          ) : null}
          {mode === "market" ? (
            <button type="button" aria-label="Add a live link" onClick={onPlus} className={iconClass}>
              <Plus className="size-5" strokeWidth={1.75} />
            </button>
          ) : null}
          {mode === "editor" ? null : <AccountSlot />}
        </div>
      </div>
      {sheet ? <AddLinkSheet onClose={() => setSheet(false)} /> : null}
    </header>
  );
}
