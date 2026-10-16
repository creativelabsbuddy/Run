export function AppPreview({ slug }: { slug: string }) {
  switch (slug) {
    case "gst-calculator":
      return <GstShot />;
    case "emi-calculator":
      return <EmiShot />;
    case "invoice":
      return <InvoiceShot />;
    case "json-formatter":
      return <JsonShot />;
    case "quote-calculator":
      return <QuoteShot />;
    case "contact-form":
      return <ContactShot />;
    default:
      return null;
  }
}

function GstShot() {
  return (
    <div className="flex flex-col">
      <p className="text-[9px] text-muted">GST Calculator</p>
      <p className="mt-0.5 text-sm font-semibold tracking-tight tabular-nums">₹1,180.00</p>
      <div className="mt-1.5 flex items-center justify-between text-[9px]">
        <span className="text-muted">GST Rate (%)</span>
        <span>18%</span>
      </div>
      <Track at="64%" left="0%" mid="18%" right="28%" />
      <div className="mt-1.5 flex flex-col gap-1 rounded-md bg-black/35 px-1.5 py-1">
        <MiniRow k="GST Amount" v="₹180.00" />
        <MiniRow k="Total Amount" v="₹1,180.00" />
      </div>
      <div className="mt-auto pt-1.5">
        <div className="grid h-6 place-items-center rounded-md text-[10px] font-medium grad-fill">Calculate</div>
      </div>
    </div>
  );
}

function EmiShot() {
  return (
    <div className="flex flex-col">
      <p className="text-[9px] text-muted">EMI Calculator</p>
      <p className="text-[8px] text-muted">Monthly EMI</p>
      <p className="text-sm font-semibold tracking-tight tabular-nums">₹9,876.00</p>
      <div className="mt-1 flex items-center justify-between text-[9px]">
        <span className="text-muted">Loan Amount</span>
        <span className="tabular-nums">₹5,00,000</span>
      </div>
      <Track at="42%" left="" right="" bare />
      <div className="mt-1 flex items-center justify-between text-[9px]">
        <span className="text-muted">Interest Rate (Annual)</span>
        <span>10.5%</span>
      </div>
      <Track at="35%" left="" right="" bare />
      <div className="mt-1 flex items-center justify-between text-[9px]">
        <span className="text-muted">Tenure (Months)</span>
        <span>60</span>
      </div>
      <Track at="50%" left="" right="" bare />
      <div className="mt-auto pt-1">
        <MiniRow k="Total Payable" v="₹5,92,560" />
      </div>
    </div>
  );
}

function InvoiceShot() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-muted">Invoice</p>
        <span className="text-[9px] text-muted" aria-hidden="true">
          ↓
        </span>
      </div>
      <p className="mt-1 text-[10px] font-medium">Invoice #INV-1001</p>
      <div className="mt-1.5 flex flex-col gap-1">
        <MiniRow k="Client" v="Acme Corp" />
        <MiniRow k="Amount" v="₹25,000.00" />
        <div className="flex items-center justify-between gap-2 text-[9px]">
          <span className="text-muted">Status</span>
          <span className="rounded-full bg-emerald-900/80 px-1.5 py-px text-[8px] font-medium text-emerald-300">
            Paid
          </span>
        </div>
      </div>
      <div className="mt-auto pt-1.5">
        <div className="grid h-6 place-items-center rounded-md text-[10px] font-medium grad-fill">
          Generate Invoice
        </div>
      </div>
    </div>
  );
}

function JsonShot() {
  return (
    <div className="flex flex-col">
      <p className="text-[9px] text-muted">JSON</p>
      <pre className="mt-1 flex-1 overflow-hidden font-mono text-[9px] leading-relaxed text-fg">{`{
  "ok": true,
  "items": 2
}`}</pre>
      <div className="mt-auto grid h-6 place-items-center rounded-md text-[10px] font-medium text-fg ring-1 ring-line">
        Format
      </div>
    </div>
  );
}

function QuoteShot() {
  return (
    <div className="flex flex-col">
      <p className="text-[9px] text-muted">Quote</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">₹48,600</p>
      <div className="mt-1.5 flex flex-col gap-1">
        <MiniRow k="Lines" v="3" />
        <MiniRow k="Discount" v="10%" />
        <MiniRow k="Tax" v="18%" />
      </div>
      <div className="mt-auto pt-1.5">
        <div className="grid h-6 place-items-center rounded-md text-[10px] font-medium text-fg ring-1 ring-line">
          Total
        </div>
      </div>
    </div>
  );
}

function ContactShot() {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] text-muted">Contact</p>
      <Fake k="Name" v="Aarav Mehta" />
      <Fake k="Email" v="aarav@studio.in" />
      <div className="mt-auto grid h-6 place-items-center rounded-md text-[10px] font-medium text-fg ring-1 ring-line">
        Send
      </div>
    </div>
  );
}

function Track({
  at,
  left,
  mid,
  right,
  bare = false,
}: {
  at: string;
  left: string;
  mid?: string;
  right: string;
  bare?: boolean;
}) {
  return (
    <div className={bare ? "mt-0.5" : "mt-1"}>
      <div className="relative h-1 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white/75" style={{ width: at }} />
        <span
          className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ left: at }}
        />
      </div>
      {bare ? null : (
        <div className="mt-0.5 flex justify-between text-[8px] text-muted">
          <span>{left}</span>
          <span>{mid}</span>
          <span>{right}</span>
        </div>
      )}
    </div>
  );
}

function MiniRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-1 text-[9px]">
      <span className="truncate text-muted">{k}</span>
      <span className="shrink-0 tabular-nums">{v}</span>
    </div>
  );
}

function Fake({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-[8px] text-muted">{k}</p>
      <p className="truncate rounded bg-white/5 px-1 py-0.5 text-[9px]">{v}</p>
    </div>
  );
}
