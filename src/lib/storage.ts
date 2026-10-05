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

/** Yedek dosyasının biçimi: sürüm alanı ileride göç (migration) yapabilmek için tutulur. */
export interface Backup {
  app: "teklif";
  version: 1;
  exportedAt: string;
  seller: Party;
  docs: Doc[];
}

/** Tüm belgeleri ve firma bilgilerini okunabilir bir JSON yedeğine çevirir. */
export function exportBackup(docs: Doc[], seller: Party, now = new Date()): string {
  const backup: Backup = { app: "teklif", version: 1, exportedAt: now.toISOString(), seller, docs };
  return JSON.stringify(backup, null, 2);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const KINDS = ["teklif", "fatura"];
const STATUSES = ["taslak", "gonderildi", "kabul", "odendi"];
const CURRENCIES = ["TRY", "EUR", "USD"];

function isParty(v: unknown): v is Party {
  return isObj(v) && ["name", "address", "taxOffice", "taxNo", "email", "phone"].every((k) => typeof v[k] === "string");
}

function isItem(v: unknown): boolean {
  return isObj(v) && typeof v.id === "string" && typeof v.description === "string" && typeof v.unit === "string"
    && [v.quantity, v.unitPrice, v.vatRate].every((n) => typeof n === "number" && Number.isFinite(n));
}

function isDoc(v: unknown): v is Doc {
  return isObj(v) && typeof v.id === "string" && typeof v.number === "string"
    && KINDS.includes(v.kind as string) && STATUSES.includes(v.status as string) && CURRENCIES.includes(v.currency as string)
    && typeof v.issueDate === "string" && typeof v.dueDate === "string" && typeof v.notes === "string"
    && typeof v.discountPercent === "number" && typeof v.createdAt === "number" && typeof v.updatedAt === "number"
    && isParty(v.seller) && isParty(v.buyer) && Array.isArray(v.items) && v.items.every(isItem);
}

/** JSON yedeğini doğrular; bozuk ya da başka bir uygulamaya ait dosyada anlaşılır bir hata fırlatır. */
export function parseBackup(json: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("Dosya geçerli bir JSON değil.");
  }
  if (!isObj(data) || data.app !== "teklif") throw new Error("Bu dosya bir Teklif yedeği değil.");
  if (data.version !== 1) throw new Error(`Desteklenmeyen yedek sürümü: ${String(data.version)}`);
  if (!isParty(data.seller)) throw new Error("Yedekteki firma bilgileri bozuk.");
  if (!Array.isArray(data.docs)) throw new Error("Yedekte belge listesi yok.");
  const bad = data.docs.findIndex((d) => !isDoc(d));
  if (bad >= 0) throw new Error(`Yedekteki ${bad + 1}. belge bozuk.`);
  return data as unknown as Backup;
}

/** Yedekteki belgeleri mevcut listeye ekler; aynı id'li belge varsa yedektekiyle değiştirilir. */
export function mergeDocs(current: Doc[], incoming: Doc[]): { docs: Doc[]; added: number; replaced: number } {
  const byId = new Map(incoming.map((d) => [d.id, d]));
  const replaced = current.filter((d) => byId.has(d.id)).length;
  const kept = current.filter((d) => !byId.has(d.id));
  return { docs: [...incoming, ...kept], added: incoming.length - replaced, replaced };
}
