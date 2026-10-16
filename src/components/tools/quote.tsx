import { useState } from "react";
import { quoteTotals, readNumber, showMoney, sumQtyRate } from "@/lib/money";
import { QUOTE_DISCOUNT, QUOTE_FOR, QUOTE_LINES, QUOTE_TAX } from "@/lib/seeds";
import { Field, Hero, Mini, fieldClass } from "@/components/ui";
import { LineEditor } from "@/components/line-editor";

export function QuoteTool() {
  const [client, setClient] = useState(QUOTE_FOR);
  const [discount, setDiscount] = useState(QUOTE_DISCOUNT);
  const [tax, setTax] = useState(QUOTE_TAX);
  const [lines, setLines] = useState(QUOTE_LINES);
  const totals = quoteTotals(sumQtyRate(lines), readNumber(discount) ?? 0, readNumber(tax) ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <Hero label={client.trim() || "Quote"} value={showMoney(totals.total)}>
        <div className="grid grid-cols-3 gap-3">
          <Mini k="Subtotal" v={showMoney(totals.subtotal)} />
          <Mini k="Discount" v={showMoney(totals.discount)} />
          <Mini k="Tax" v={showMoney(totals.tax)} />
        </div>
      </Hero>
      <Field label="For">
        <input
          value={client}
          onChange={(event) => setClient(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Discount %">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Tax %">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={tax}
            onChange={(event) => setTax(event.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
      <LineEditor lines={lines} onChange={setLines} />
    </div>
  );
}
