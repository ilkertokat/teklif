import { docTotals, formatMoney, lineTotal } from "../lib/money";
import type { Doc } from "../lib/types";
import { amountInWords } from "../lib/words";

const fmtDate = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("tr-TR") : "—");

/** A4 belge önizlemesi. Yazdırıldığında yalnızca bu bileşen kağıda çıkar. */
export function Preview({ doc }: { doc: Doc }) {
  const t = docTotals(doc);
  const m = (c: number) => formatMoney(c, doc.currency);
  const title = doc.kind === "teklif" ? "FİYAT TEKLİFİ" : "FATURA";

  return (
    <article className="paper" id="paper">
      <header className="p-head">
        <div>
          <div className="p-seller">{doc.seller.name || "Firma adınız"}</div>
          <div className="p-small pre">{doc.seller.address}</div>
          <div className="p-small">
            {doc.seller.taxOffice && `${doc.seller.taxOffice} V.D. · `}{doc.seller.taxNo && `VKN ${doc.seller.taxNo}`}
          </div>
          <div className="p-small">{[doc.seller.email, doc.seller.phone].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="p-title">
          <h1>{title}</h1>
          <table className="p-meta"><tbody>
            <tr><th>No</th><td>{doc.number}</td></tr>
            <tr><th>Tarih</th><td>{fmtDate(doc.issueDate)}</td></tr>
            <tr><th>{doc.kind === "teklif" ? "Geçerlilik" : "Vade"}</th><td>{fmtDate(doc.dueDate)}</td></tr>
          </tbody></table>
        </div>
      </header>

      <section className="p-buyer">
        <div className="p-label">Sayın</div>
        <div className="p-bname">{doc.buyer.name || "Müşteri adı"}</div>
        <div className="p-small pre">{doc.buyer.address}</div>
        <div className="p-small">
          {doc.buyer.taxOffice && `${doc.buyer.taxOffice} V.D. · `}{doc.buyer.taxNo && `VKN/TCKN ${doc.buyer.taxNo}`}
        </div>
      </section>

      <table className="p-items">
        <thead><tr><th>#</th><th>Açıklama</th><th className="r">Miktar</th><th className="r">Birim fiyat</th><th className="r">KDV</th><th className="r">Tutar</th></tr></thead>
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={it.id}>
              <td>{i + 1}</td><td>{it.description || <span className="muted">—</span>}</td>
              <td className="r">{it.quantity} {it.unit}</td><td className="r">{m(Math.round(it.unitPrice * 100))}</td>
              <td className="r">%{it.vatRate}</td><td className="r">{m(lineTotal(it))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="p-bottom">
        <div className="p-notes">
          <div className="p-words">{amountInWords(t.grandTotal, doc.currency)}</div>
          {doc.notes && <><div className="p-label">Notlar</div><div className="p-small pre">{doc.notes}</div></>}
        </div>
        <table className="p-totals"><tbody>
          <tr><th>Ara toplam</th><td>{m(t.subtotal)}</td></tr>
          {t.discount > 0 && <tr><th>İskonto (%{doc.discountPercent})</th><td>−{m(t.discount)}</td></tr>}
          {t.vatGroups.map((g) => (
            <tr key={g.rate}><th>KDV %{g.rate} <span className="muted">({m(g.base)})</span></th><td>{m(g.vat)}</td></tr>
          ))}
          <tr className="grand"><th>Genel toplam</th><td>{m(t.grandTotal)}</td></tr>
        </tbody></table>
      </div>

      <footer className="p-foot">
        {doc.kind === "teklif" ? "Bu belge bir fiyat teklifidir; fatura yerine geçmez." : "Ödemeniz için teşekkür ederiz."}
      </footer>
    </article>
  );
}
