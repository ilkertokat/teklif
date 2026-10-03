import type { ChangeEvent } from "react";
import { uid } from "../lib/storage";
import type { Currency, Doc, DocStatus, LineItem, Party } from "../lib/types";

interface Props {
  doc: Doc;
  onChange: (doc: Doc) => void;
}

const STATUSES: Record<DocStatus, string> = { taslak: "Taslak", gonderildi: "Gönderildi", kabul: "Kabul edildi", odendi: "Ödendi" };

function PartyFields({ title, party, onChange }: { title: string; party: Party; onChange: (p: Party) => void }) {
  const set = (k: keyof Party) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...party, [k]: e.target.value });
  return (
    <fieldset>
      <legend>{title}</legend>
      <input placeholder="Unvan / ad soyad" value={party.name} onChange={set("name")} />
      <textarea placeholder="Adres" rows={2} value={party.address} onChange={set("address")} />
      <div className="grid2">
        <input placeholder="Vergi dairesi" value={party.taxOffice} onChange={set("taxOffice")} />
        <input placeholder="VKN / TCKN" value={party.taxNo} onChange={set("taxNo")} />
        <input placeholder="E-posta" value={party.email} onChange={set("email")} />
        <input placeholder="Telefon" value={party.phone} onChange={set("phone")} />
      </div>
    </fieldset>
  );
}

export function Editor({ doc, onChange }: Props) {
  const patch = (p: Partial<Doc>) => onChange({ ...doc, ...p });
  const setItem = (id: string, p: Partial<LineItem>) =>
    patch({ items: doc.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });
  const num = (v: string) => (v === "" ? 0 : Number(v.replace(",", ".")));

  return (
    <div className="editor">
      <div className="grid4">
        <label>Numara<input value={doc.number} onChange={(e) => patch({ number: e.target.value })} /></label>
        <label>Tarih<input type="date" value={doc.issueDate} onChange={(e) => patch({ issueDate: e.target.value })} /></label>
        <label>{doc.kind === "teklif" ? "Geçerlilik" : "Vade"}<input type="date" value={doc.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} /></label>
        <label>Durum
          <select value={doc.status} onChange={(e) => patch({ status: e.target.value as DocStatus })}>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      <div className="grid2">
        <PartyFields title="Düzenleyen (siz)" party={doc.seller} onChange={(seller) => patch({ seller })} />
        <PartyFields title="Müşteri" party={doc.buyer} onChange={(buyer) => patch({ buyer })} />
      </div>

      <fieldset>
        <legend>Kalemler</legend>
        <div className="items">
          <div className="item head"><span>Açıklama</span><span>Miktar</span><span>Birim</span><span>Birim fiyat</span><span>KDV</span><span /></div>
          {doc.items.map((it) => (
            <div className="item" key={it.id}>
              <input placeholder="Hizmet / ürün" value={it.description} onChange={(e) => setItem(it.id, { description: e.target.value })} />
              <input inputMode="decimal" value={it.quantity} onChange={(e) => setItem(it.id, { quantity: num(e.target.value) })} />
              <input value={it.unit} onChange={(e) => setItem(it.id, { unit: e.target.value })} />
              <input inputMode="decimal" value={it.unitPrice} onChange={(e) => setItem(it.id, { unitPrice: num(e.target.value) })} />
              <select value={it.vatRate} onChange={(e) => setItem(it.id, { vatRate: Number(e.target.value) })}>
                {[20, 10, 1, 0].map((r) => <option key={r} value={r}>%{r}</option>)}
              </select>
              <button className="icon" title="Kalemi sil" disabled={doc.items.length === 1}
                onClick={() => patch({ items: doc.items.filter((i) => i.id !== it.id) })}>✕</button>
            </div>
          ))}
        </div>
        <button className="ghost" onClick={() => patch({ items: [...doc.items, { id: uid(), description: "", quantity: 1, unit: "adet", unitPrice: 0, vatRate: 20 }] })}>
          + Kalem ekle
        </button>
      </fieldset>

      <div className="grid3">
        <label>İskonto (%)<input inputMode="decimal" value={doc.discountPercent} onChange={(e) => patch({ discountPercent: num(e.target.value) })} /></label>
        <label>Para birimi
          <select value={doc.currency} onChange={(e) => patch({ currency: e.target.value as Currency })}>
            <option value="TRY">TRY (₺)</option><option value="EUR">EUR (€)</option><option value="USD">USD ($)</option>
          </select>
        </label>
      </div>
      <label>Notlar<textarea rows={3} value={doc.notes} onChange={(e) => patch({ notes: e.target.value })} /></label>
    </div>
  );
}
