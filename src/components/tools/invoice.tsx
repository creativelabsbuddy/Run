import { useState } from "react";
import { inr, readNumber, sumQtyRate } from "@/lib/money";
import {
  INVOICE_DATE,
  INVOICE_FROM,
  INVOICE_LINES,
  INVOICE_NO,
  INVOICE_TO,
  type DraftLine,
} from "@/lib/seeds";
import { Field, fieldClass } from "@/components/ui";
import { LineEditor } from "@/components/line-editor";

export function InvoiceTool() {
  const [from, setFrom] = useState(INVOICE_FROM);
  const [to, setTo] = useState(INVOICE_TO);
  const [number, setNumber] = useState(INVOICE_NO);
  const [date, setDate] = useState(INVOICE_DATE);
  const [lines, setLines] = useState(INVOICE_LINES);
  const total = sumQtyRate(lines);

  return (
    <div className="flex flex-col-reverse gap-8 lg:grid lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-5">
        <Field label="From">
          <input value={from} onChange={(event) => setFrom(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="Bill to">
          <input value={to} onChange={(event) => setTo(event.target.value)} className={fieldClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Number">
            <input
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Date">
            <input value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
          </Field>
        </div>
        <LineEditor lines={lines} onChange={setLines} />
      </div>
      <InvoicePaper
        from={from}
        to={to}
        number={number}
        date={date}
        lines={lines}
        total={total}
      />
    </div>
  );
}

function InvoicePaper({
  from,
  to,
  number,
  date,
  lines,
  total,
}: {
  from: string;
  to: string;
  number: string;
  date: string;
  lines: DraftLine[];
  total: number;
}) {
  return (
    <article className="rounded-card bg-paper p-6 text-bg sm:p-8 lg:sticky lg:top-20">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-bg/50">From</p>
          <p className="mt-1 truncate text-lg font-semibold">{from.trim() || "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs tracking-wide text-bg/50">Invoice</p>
          <p className="mt-1 font-medium tabular-nums">{number.trim() || "—"}</p>
          <p className="text-sm text-bg/60">{date.trim() || "—"}</p>
        </div>
      </header>
      <div className="mt-6">
        <p className="text-xs tracking-wide text-bg/50">Bill to</p>
        <p className="mt-1 font-medium">{to.trim() || "—"}</p>
      </div>
      <div className="mt-6 border-t border-bg/10">
        {lines.length === 0 ? (
          <p className="py-4 text-sm text-bg/50">No lines yet.</p>
        ) : (
          lines.map((line) => {
            const amount = (readNumber(line.qty) ?? 0) * (readNumber(line.rate) ?? 0);
            return (
              <div
                key={line.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-bg/10 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{line.desc.trim() || "Untitled"}</p>
                  <p className="text-xs text-bg/50 tabular-nums">
                    {line.qty || "0"} × {inr(readNumber(line.rate) ?? 0)}
                  </p>
                </div>
                <p className="tabular-nums">{inr(amount)}</p>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between border-t border-bg/10 pt-4">
        <span className="text-sm text-bg/60">Total</span>
        <span className="text-2xl font-semibold tabular-nums">{inr(total)}</span>
      </div>
    </article>
  );
}
