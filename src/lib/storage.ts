import { emptyParty, type Doc, type DocKind, type Party } from "./types";

const DOCS_KEY = "teklif.docs.v1";
const SELLER_KEY = "teklif.seller.v1";

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const today = (): string => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number): string => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const loadDocs = (): Doc[] => read<Doc[]>(DOCS_KEY, []);
export const saveDocs = (docs: Doc[]): void => localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
export const loadSeller = (): Party => read<Party>(SELLER_KEY, emptyParty());
export const saveSeller = (p: Party): void => localStorage.setItem(SELLER_KEY, JSON.stringify(p));

/** Yıla ve türe göre sıradaki belge numarası: TKL-2026-003, FTR-2026-012 */
export function nextNumber(docs: Doc[], kind: DocKind, year = new Date().getFullYear()): string {
  const prefix = `${kind === "teklif" ? "TKL" : "FTR"}-${year}-`;
  const max = docs
    .filter((d) => d.number.startsWith(prefix))
    .map((d) => parseInt(d.number.slice(prefix.length), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(max + 1).padStart(3, "0");
}

export function newDoc(docs: Doc[], kind: DocKind, seller: Party): Doc {
  const now = Date.now();
  const issue = today();
  return {
    id: uid(), kind, number: nextNumber(docs, kind), status: "taslak",
    issueDate: issue, dueDate: addDays(issue, kind === "teklif" ? 15 : 30),
    currency: "TRY", seller, buyer: emptyParty(),
    items: [{ id: uid(), description: "", quantity: 1, unit: "adet", unitPrice: 0, vatRate: 20 }],
    discountPercent: 0, notes: kind === "teklif" ? "Teklif 15 gün geçerlidir." : "", createdAt: now, updatedAt: now,
  };
}

/** Kabul edilen teklifi faturaya dönüştürür (kalemler ve müşteri korunur, yeni numara alır). */
export function quoteToInvoice(docs: Doc[], quote: Doc): Doc {
  const inv = newDoc(docs, "fatura", quote.seller);
  return { ...inv, buyer: { ...quote.buyer }, currency: quote.currency,
    items: quote.items.map((i) => ({ ...i, id: uid() })), discountPercent: quote.discountPercent,
    notes: `${quote.number} numaralı teklife istinaden düzenlenmiştir.` };
}
