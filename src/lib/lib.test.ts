import { describe, expect, it } from "vitest";
import { computeTotals, formatMoney, lineTotal, toCents } from "./money";
import { amountInWords, numberToWords } from "./words";
import { nextNumber, quoteToInvoice } from "./storage";
import { emptyParty, type Doc, type LineItem } from "./types";

const item = (quantity: number, unitPrice: number, vatRate = 20): LineItem =>
  ({ id: String(Math.random()), description: "x", quantity, unit: "adet", unitPrice, vatRate });

describe("money", () => {
  it("avoids floating point errors by working in cents", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(lineTotal(item(3, 19.99))).toBe(5997);
  });

  it("computes totals for a single VAT rate", () => {
    const t = computeTotals([item(2, 1000), item(1, 500)]);
    expect(t.subtotal).toBe(250000);
    expect(t.vatTotal).toBe(50000);
    expect(t.grandTotal).toBe(300000);
    expect(t.discount).toBe(0);
  });

  it("groups VAT by rate, highest rate first", () => {
    const t = computeTotals([item(1, 100, 10), item(1, 200, 20), item(1, 50, 0)]);
    expect(t.vatGroups.map((g) => g.rate)).toEqual([20, 10, 0]);
    expect(t.vatGroups.map((g) => g.vat)).toEqual([4000, 1000, 0]);
    expect(t.grandTotal).toBe(35000 + 5000);
  });

  it("applies the discount before VAT, proportionally per group", () => {
    const t = computeTotals([item(1, 1000, 20), item(1, 1000, 10)], 10);
    expect(t.discount).toBe(20000);
    expect(t.net).toBe(180000);
    expect(t.vatGroups).toEqual([
      { rate: 20, base: 90000, vat: 18000 },
      { rate: 10, base: 90000, vat: 9000 },
    ]);
    expect(t.grandTotal).toBe(207000);
  });

  it("clamps invalid discounts", () => {
    expect(computeTotals([item(1, 100)], 150).net).toBe(0);
    expect(computeTotals([item(1, 100)], -5).discount).toBe(0);
  });

  it("formats currency per locale", () => {
    expect(formatMoney(123456, "TRY").replace(/\s/g, " ")).toMatch(/1\.234,56/);
    expect(formatMoney(123456, "USD")).toBe("$1,234.56");
  });
});

describe("words", () => {
  it.each([
    [0, "sıfır"], [7, "yedi"], [10, "on"], [19, "ondokuz"], [100, "yüz"], [101, "yüzbir"],
    [999, "dokuzyüzdoksandokuz"], [1000, "bin"], [1001, "binbir"], [2026, "ikibinyirmialtı"],
    [100000, "yüzbin"], [1_000_000, "birmilyon"], [1_250_300, "birmilyonikiyüzellibinüçyüz"],
  ])("%i → %s", (n, w) => expect(numberToWords(n)).toBe(w));

  it("writes the amount line used on Turkish invoices", () => {
    expect(amountInWords(300000)).toBe("Yalnız Üçbin TL");
    expect(amountInWords(125050)).toBe("Yalnız Binikiyüzelli TL elli kuruş");
    expect(amountInWords(1999, "EUR")).toBe("Yalnız Ondokuz Euro doksandokuz cent");
  });
});

describe("numbering", () => {
  const doc = (number: string): Doc => ({
    id: number, kind: number.startsWith("TKL") ? "teklif" : "fatura", number, status: "taslak",
    issueDate: "2026-01-01", dueDate: "2026-01-15", currency: "TRY", seller: emptyParty(), buyer: emptyParty(),
    items: [item(1, 100)], discountPercent: 0, notes: "", createdAt: 0, updatedAt: 0,
  });

  it("continues the sequence per kind and year", () => {
    const docs = [doc("TKL-2026-001"), doc("TKL-2026-007"), doc("FTR-2026-002"), doc("TKL-2025-050")];
    expect(nextNumber(docs, "teklif", 2026)).toBe("TKL-2026-008");
    expect(nextNumber(docs, "fatura", 2026)).toBe("FTR-2026-003");
    expect(nextNumber([], "fatura", 2027)).toBe("FTR-2027-001");
  });

  it("converts a quote into an invoice with fresh ids", () => {
    const q = { ...doc("TKL-2026-001"), buyer: { ...emptyParty(), name: "Müşteri" }, discountPercent: 5 };
    const inv = quoteToInvoice([q], q);
    expect(inv.kind).toBe("fatura");
    expect(inv.buyer.name).toBe("Müşteri");
    expect(inv.discountPercent).toBe(5);
    expect(inv.items[0].id).not.toBe(q.items[0].id);
    expect(inv.notes).toContain("TKL-2026-001");
  });
});
