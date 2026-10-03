export type DocKind = "teklif" | "fatura";
export type DocStatus = "taslak" | "gonderildi" | "kabul" | "odendi";
export type Currency = "TRY" | "EUR" | "USD";

export interface Party {
  name: string;
  address: string;
  taxOffice: string;
  taxNo: string;
  email: string;
  phone: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number; // yüzde: 0, 1, 10, 20
}

export interface Doc {
  id: string;
  kind: DocKind;
  number: string;
  status: DocStatus;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;
  currency: Currency;
  seller: Party;
  buyer: Party;
  items: LineItem[];
  discountPercent: number;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export const emptyParty = (): Party => ({ name: "", address: "", taxOffice: "", taxNo: "", email: "", phone: "" });
