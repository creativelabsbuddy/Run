import type { ReactNode } from "react";

export const fieldClass =
  "h-12 w-full min-w-0 rounded-control bg-input px-4 text-base text-fg outline-none ring-1 ring-inset ring-line placeholder:text-muted focus-visible:ring-line-strong";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{k}</p>
      <p className="mt-0.5 text-sm tabular-nums">{v}</p>
    </div>
  );
}

export function Hero({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-card bg-card p-5 ring-1 ring-line">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{value}</p>
      {children ? <div className="mt-4 border-t border-line pt-4">{children}</div> : null}
    </section>
  );
}
