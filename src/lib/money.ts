import type { Currency, Doc, LineItem } from "./types";

/**
 * Kayan nokta hatalarını önlemek için tüm hesaplar kuruş (tam sayı) üzerinden yapılır.
 * `1.005 * 100` ikilik tabanda 100.49999… çıktığı için önce 15 anlamlı basamağa yuvarlanır;
 * yarım kuruş sıfırdan uzağa yuvarlanır (iade gibi eksi tutarlar da simetrik: -1,005 → -1,01).
 */
export function toCents(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const scaled = Number((n * 100).toPrecision(15));
  return Math.sign(scaled) * Math.round(Math.abs(scaled)) || 0;
}
export const fromCents = (c: number): number => c / 100;

export interface VatGroup {
  rate: number;
  base: number; // iskonto sonrası matrah (kuruş)
  vat: number; // KDV tutarı (kuruş)
}

export interface Totals {
  subtotal: number; // kuruş, iskonto öncesi
  discount: number;
  net: number; // iskonto sonrası matrah toplamı
  vatGroups: VatGroup[];
  vatTotal: number;
  grandTotal: number;
}

export const lineTotal = (item: LineItem): number => toCents(item.quantity * item.unitPrice);

/**
 * Belge toplamlarını hesaplar.
 * İskonto her KDV grubuna orantılı uygulanır; KDV, iskonto sonrası matrah üzerinden
 * grup bazında hesaplanıp yuvarlanır (faturalardaki "KDV %20 matrahı" satırlarıyla uyumlu).
 */
export function computeTotals(items: LineItem[], discountPercent = 0): Totals {
  const pct = Math.min(Math.max(discountPercent || 0, 0), 100);
  const byRate = new Map<number, number>();
  for (const it of items) {
    byRate.set(it.vatRate, (byRate.get(it.vatRate) ?? 0) + lineTotal(it));
  }
  const subtotal = [...byRate.values()].reduce((a, b) => a + b, 0);

  const vatGroups: VatGroup[] = [...byRate.entries()]
    .sort(([a], [b]) => b - a)
    .map(([rate, gross]) => {
      const base = gross - Math.round((gross * pct) / 100);
      return { rate, base, vat: Math.round((base * rate) / 100) };
    });
  const net = vatGroups.reduce((a, g) => a + g.base, 0);
  const vatTotal = vatGroups.reduce((a, g) => a + g.vat, 0);
  return { subtotal, discount: subtotal - net, net, vatGroups, vatTotal, grandTotal: net + vatTotal };
}

export const docTotals = (d: Doc): Totals => computeTotals(d.items, d.discountPercent);

const LOCALE: Record<Currency, string> = { TRY: "tr-TR", EUR: "de-DE", USD: "en-US" };

export function formatMoney(cents: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALE[currency], { style: "currency", currency }).format(fromCents(cents));
}
