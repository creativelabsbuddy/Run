import { useState } from "react";
import { monthlyEmi, readNumber, showMoney } from "@/lib/money";
import { Field, Hero, Mini, fieldClass } from "@/components/ui";

export function EmiTool() {
  const [principal, setPrincipal] = useState("2500000");
  const [rate, setRate] = useState("8.5");
  const [years, setYears] = useState("20");
  const parts = monthlyEmi(readNumber(principal) ?? -1, readNumber(rate) ?? -1, readNumber(years) ?? -1);

  return (
    <div className="flex flex-col gap-6">
      <Hero label="Monthly" value={showMoney(parts?.emi)}>
        <div className="grid grid-cols-2 gap-4">
          <Mini k="Interest" v={showMoney(parts?.interest)} />
          <Mini k="Total paid" v={showMoney(parts?.total)} />
        </div>
      </Hero>
      <Field label="Amount">
        <input
          inputMode="decimal"
          autoComplete="off"
          value={principal}
          onChange={(event) => setPrincipal(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Yearly interest">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Years">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={years}
            onChange={(event) => setYears(event.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
    </div>
  );
}
