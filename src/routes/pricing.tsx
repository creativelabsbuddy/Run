import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppFrame } from "@/components/chrome";
import { mirrorLedger, CREDIT_PACK, CREDIT_PACK_PRICE, hasPaidPack, readCredits } from "@/lib/projects";
import { grantPack } from "@/lib/ledger-api";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const [credits, setCredits] = useState(readCredits);
  const [paid, setPaid] = useState(hasPaidPack);

  function buy() {
    void grantPack({ data: { credits: readCredits(), paid: hasPaidPack() } })
      .then((row) => {
        mirrorLedger(row.credits, row.paid);
        setCredits(row.credits);
        setPaid(row.paid);
      })
      .catch(() => undefined);
  }

  return (
    <AppFrame mode="projects">
      <main className="mx-auto w-full max-w-lg px-4 pt-8 pb-safe">
        <h1 className="text-2xl font-semibold tracking-tight">Pro</h1>
        <p className="mt-2 text-sm text-muted">120 credits for building and editing.</p>
        <section className="mt-6 rounded-card bg-card p-5">
          <p className="text-sm text-muted">Pro</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">₹{CREDIT_PACK_PRICE}</p>
          <p className="mt-1 text-sm text-muted">{CREDIT_PACK} credits</p>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-muted">
            <li>120 credits for builds and edits.</li>
            <li>2 live sites on Run, included.</li>
            <li>15 credits every month.</li>
          </ul>
          <p className="mt-4 text-sm text-muted">Pay $10 to export your project to GitHub. Export is not included in Pro.</p>
          <button type="button" onClick={buy} className="mt-6 h-11 w-full rounded-full bg-fg text-sm font-medium text-bg">
            Buy Pro
          </button>
          {paid ? <p className="mt-3 text-sm text-muted">Pro is on. {credits} credits.</p> : null}
        </section>
      </main>
    </AppFrame>
  );
}
