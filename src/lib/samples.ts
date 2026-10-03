import { uid } from "./storage";
import type { Doc, Party } from "./types";

/** İlk açılışta uygulamanın boş görünmemesi için örnek belgeler. */
export const sampleSeller: Party = {
  name: "Örnek Yazılım Hizmetleri",
  address: "Cumhuriyet Cad. No:12\nAntakya / Hatay",
  taxOffice: "Antakya", taxNo: "1234567890",
  email: "merhaba@ornekyazilim.com", phone: "+90 555 000 00 00",
};

const buyer = (name: string, address: string): Party =>
  ({ name, address, taxOffice: "Merkez", taxNo: "9876543210", email: "", phone: "" });

export function sampleDocs(): Doc[] {
  const now = Date.now();
  const base = { seller: sampleSeller, currency: "TRY" as const, createdAt: now, updatedAt: now };
  return [
    {
      ...base, id: uid(), kind: "teklif", number: "TKL-2026-004", status: "gonderildi",
      issueDate: "2026-09-28", dueDate: "2026-10-13",
      buyer: buyer("Lezzet Kafe & Pastane", "Atatürk Bulvarı No:45\nİskenderun / Hatay"),
      items: [
        { id: uid(), description: "Kurumsal web sitesi tasarımı ve geliştirme (WordPress)", quantity: 1, unit: "proje", unitPrice: 18000, vatRate: 20 },
        { id: uid(), description: "QR kodlu dijital menü modülü", quantity: 1, unit: "adet", unitPrice: 6500, vatRate: 20 },
        { id: uid(), description: "Alan adı ve SSL kurulumu", quantity: 1, unit: "yıl", unitPrice: 1200, vatRate: 20 },
        { id: uid(), description: "Bakım ve güncelleme hizmeti", quantity: 12, unit: "ay", unitPrice: 750, vatRate: 20 },
      ],
      discountPercent: 10, notes: "Teklif 15 gün geçerlidir.\nÖdeme: %50 sipariş onayında, %50 teslimde.",
    },
    {
      ...base, id: uid(), kind: "fatura", number: "FTR-2026-011", status: "odendi",
      issueDate: "2026-09-15", dueDate: "2026-10-15",
      buyer: buyer("Yıldız Oto Lastik", "Sanayi Sitesi 3. Blok No:8\nDefne / Hatay"),
      items: [
        { id: uid(), description: "E-ticaret sitesi geliştirme", quantity: 1, unit: "proje", unitPrice: 32000, vatRate: 20 },
        { id: uid(), description: "Yerel SEO çalışması", quantity: 3, unit: "ay", unitPrice: 2500, vatRate: 20 },
      ],
      discountPercent: 0, notes: "TKL-2026-002 numaralı teklife istinaden düzenlenmiştir.",
    },
    {
      ...base, id: uid(), kind: "teklif", number: "TKL-2026-005", status: "taslak",
      issueDate: "2026-10-02", dueDate: "2026-10-17",
      buyer: buyer("Akdeniz Turizm", "Harbiye Mah. No:3\nDefne / Hatay"),
      items: [
        { id: uid(), description: "Tur rezervasyon ve online ödeme entegrasyonu", quantity: 1, unit: "proje", unitPrice: 24000, vatRate: 20 },
        { id: uid(), description: "Sunucu taşıma ve kurulum", quantity: 1, unit: "adet", unitPrice: 3000, vatRate: 20 },
      ],
      discountPercent: 0, notes: "Teklif 15 gün geçerlidir.",
    },
  ];
}
