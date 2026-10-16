export function readNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function inr(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}₹${groupIndian(String(Math.abs(rounded)))}`;
}

function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${tail}`;
}

export function showMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return inr(value);
}

export type GstMode = "add" | "included";

export type GstParts = {
  taxable: number;
  gst: number;
  cgst: number;
  sgst: number;
  total: number;
};

export function gstBreakdown(amount: number, rate: number, mode: GstMode): GstParts | null {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(rate) || rate < 0) return null;
  const ratio = rate / 100;
  if (mode === "add") {
    const gst = amount * ratio;
    return { taxable: amount, gst, cgst: gst / 2, sgst: gst / 2, total: amount + gst };
  }
  const taxable = ratio === 0 ? amount : amount / (1 + ratio);
  const gst = amount - taxable;
  return { taxable, gst, cgst: gst / 2, sgst: gst / 2, total: amount };
}

export type EmiParts = { emi: number; interest: number; total: number };

export function monthlyEmi(principal: number, annualPct: number, years: number): EmiParts | null {
  if (!(principal > 0) || !(annualPct >= 0) || !(years > 0)) return null;
  const months = years * 12;
  const monthlyRate = annualPct / 12 / 100;
  const growth = Math.pow(1 + monthlyRate, months);
  const emi =
    monthlyRate === 0 ? principal / months : (principal * monthlyRate * growth) / (growth - 1);
  if (!Number.isFinite(emi)) return null;
  const total = emi * months;
  return { emi, interest: total - principal, total };
}

export function sumQtyRate(lines: { qty: string; rate: string }[]): number {
  return lines.reduce((sum, line) => {
    const qty = readNumber(line.qty) ?? 0;
    const rate = readNumber(line.rate) ?? 0;
    return sum + qty * rate;
  }, 0);
}

export type QuoteParts = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

export function quoteTotals(subtotal: number, discountPct: number, taxPct: number): QuoteParts {
  const discount = subtotal * (discountPct / 100);
  const after = subtotal - discount;
  const tax = after * (taxPct / 100);
  return { subtotal, discount, tax, total: after + tax };
}
