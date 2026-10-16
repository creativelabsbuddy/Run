import { useState } from "react";
import { gstBreakdown, readNumber, showMoney, type GstMode } from "@/lib/money";
import { Field, Hero, Mini, fieldClass } from "@/components/ui";

const RATES = [5, 12, 18, 28];

export function GstTool() {
  const [amount, setAmount] = useState("50000");
  const [rate, setRate] = useState(18);
  const [mode, setMode] = useState<GstMode>("add");
  const parsed = readNumber(amount);
  const parts = parsed == null ? null : gstBreakdown(parsed, rate, mode);

  return (
    <div className="flex flex-col gap-6">
      <Hero label="Total" value={showMoney(parts?.total)}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Mini k="Taxable" v={showMoney(parts?.taxable)} />
          <Mini k="GST" v={showMoney(parts?.gst)} />
          <Mini k="CGST" v={showMoney(parts?.cgst)} />
          <Mini k="SGST" v={showMoney(parts?.sgst)} />
        </div>
      </Hero>

      <Field label="Amount">
        <input
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={fieldClass}
        />
      </Field>

      <div>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-input p-1 ring-1 ring-line">
          {(
            [
              ["add", "On top"],
              ["included", "Included"],
            ] as const
          ).map(([value, label]) => {
            const on = mode === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => setMode(value)}
                className={
                  on
                    ? "h-10 rounded-full bg-fg text-sm font-medium text-bg"
                    : "h-10 rounded-full text-sm text-muted"
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-muted">
          {mode === "add" ? "GST is added to this amount." : "This amount already includes GST."}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm text-muted">Rate</p>
        <div className="grid grid-cols-4 gap-2">
          {RATES.map((value) => {
            const on = rate === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => setRate(value)}
                className={
                  on
                    ? "h-11 rounded-full bg-fg text-sm font-medium text-bg"
                    : "h-11 rounded-full text-sm text-muted ring-1 ring-line"
                }
              >
                {value}%
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
