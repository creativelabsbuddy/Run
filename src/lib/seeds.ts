export type DraftLine = {
  id: string;
  desc: string;
  qty: string;
  rate: string;
};

export const INVOICE_FROM = "Northwind Studio";
export const INVOICE_TO = "Aarav Mehta";
export const INVOICE_NO = "INV-1042";
export const INVOICE_DATE = "27 Sep 2026";

export const INVOICE_LINES: DraftLine[] = [
  { id: "i1", desc: "Brand film", qty: "1", rate: "12000" },
  { id: "i2", desc: "Cutdowns", qty: "2", rate: "3200" },
];

export const QUOTE_FOR = "Aarav Mehta";
export const QUOTE_DISCOUNT = "10";
export const QUOTE_TAX = "18";

export const QUOTE_LINES: DraftLine[] = [
  { id: "q1", desc: "Site audit", qty: "1", rate: "8000" },
  { id: "q2", desc: "Fixes", qty: "6", rate: "1500" },
];

export const JSON_SAMPLE = `{
  "customer": "Aarav Mehta",
  "items": 2,
  "paid": false
}`;
