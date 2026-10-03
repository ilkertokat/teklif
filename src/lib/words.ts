import type { Currency } from "./types";

const ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
const SCALES = ["", "bin", "milyon", "milyar", "trilyon"];

/** 0–999 arası sayıyı yazıya çevirir. */
function hundreds(n: number): string {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
  return [h === 0 ? "" : h === 1 ? "yüz" : ONES[h] + "yüz", TENS[t], ONES[o]].join("");
}

/** Tam sayıyı Türkçe yazıya çevirir: 1250 → "binikiyüzelli" (faturalardaki bitişik yazım). */
export function numberToWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "sıfır";
  const parts: string[] = [];
  let scale = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) {
      // Türkçede "bir bin" denmez: 1000 → "bin"
      const words = scale === 1 && chunk === 1 ? "" : hundreds(chunk);
      parts.unshift(words + SCALES[scale]);
    }
    n = Math.floor(n / 1000);
    scale++;
  }
  return parts.join("");
}

const UNITS: Record<Currency, [string, string]> = {
  TRY: ["TL", "kuruş"],
  EUR: ["Euro", "cent"],
  USD: ["Dolar", "cent"],
};

/** Kuruş cinsinden tutarı fatura altındaki "Yalnız ..." satırına çevirir. */
export function amountInWords(cents: number, currency: Currency = "TRY"): string {
  const [major, minor] = UNITS[currency];
  const whole = Math.floor(Math.abs(cents) / 100);
  const frac = Math.abs(cents) % 100;
  const text = `${numberToWords(whole)} ${major}` + (frac ? ` ${numberToWords(frac)} ${minor}` : "");
  return `Yalnız ${text.charAt(0).toLocaleUpperCase("tr-TR")}${text.slice(1)}`;
}
