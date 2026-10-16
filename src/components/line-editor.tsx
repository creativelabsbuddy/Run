import { useRef } from "react";
import { Plus, X } from "lucide-react";
import type { DraftLine } from "@/lib/seeds";
import { inr, readNumber } from "@/lib/money";
import { fieldClass } from "@/components/ui";

export function LineEditor({
  lines,
  onChange,
}: {
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
}) {
  const seq = useRef(100);

  function patch(id: string, next: Partial<DraftLine>) {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...next } : line)));
  }

  function add() {
    seq.current += 1;
    onChange([...lines, { id: `n${seq.current}`, desc: "", qty: "1", rate: "0" }]);
  }

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line) => {
        const amount = (readNumber(line.qty) ?? 0) * (readNumber(line.rate) ?? 0);
        return (
          <div key={line.id} className="rounded-card bg-card p-3 ring-1 ring-line">
            <div className="flex items-center gap-2">
              <input
                aria-label="Description"
                placeholder="Description"
                value={line.desc}
                onChange={(event) => patch(line.id, { desc: event.target.value })}
                className={`${fieldClass} flex-1`}
              />
              <button
                type="button"
                aria-label={line.desc ? `Remove ${line.desc}` : "Remove line"}
                onClick={() => onChange(lines.filter((item) => item.id !== line.id))}
                className="grid size-12 shrink-0 place-items-center rounded-full text-muted hover:bg-input hover:text-fg"
              >
                <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                aria-label="Quantity"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Qty"
                value={line.qty}
                onChange={(event) => patch(line.id, { qty: event.target.value })}
                className={fieldClass}
              />
              <input
                aria-label="Rate"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Rate"
                value={line.rate}
                onChange={(event) => patch(line.id, { rate: event.target.value })}
                className={fieldClass}
              />
            </div>
            <p className="mt-2 text-right text-sm text-muted tabular-nums">{inr(amount)}</p>
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="inline-flex h-11 items-center gap-2 self-start text-sm font-medium"
      >
        <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" />
        Add line
      </button>
    </div>
  );
}
