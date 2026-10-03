import { useEffect, useMemo, useState } from "react";
import { Editor } from "./components/Editor";
import { Preview } from "./components/Preview";
import { docTotals, formatMoney } from "./lib/money";
import { sampleDocs, sampleSeller } from "./lib/samples";
import { loadDocs, loadSeller, newDoc, quoteToInvoice, saveDocs, saveSeller, uid } from "./lib/storage";
import type { Doc, DocKind } from "./lib/types";

type Filter = "hepsi" | DocKind;
const STATUS_LABEL = { taslak: "Taslak", gonderildi: "Gönderildi", kabul: "Kabul", odendi: "Ödendi" } as const;

function initialDocs(): Doc[] {
  const stored = loadDocs();
  if (stored.length || localStorage.getItem("teklif.seeded")) return stored;
  localStorage.setItem("teklif.seeded", "1");
  saveSeller(sampleSeller);
  return sampleDocs();
}

export default function App() {
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [activeId, setActiveId] = useState<string | null>(() => docs[0]?.id ?? null);
  const [filter, setFilter] = useState<Filter>("hepsi");
  const [query, setQuery] = useState("");

  useEffect(() => saveDocs(docs), [docs]);

  const active = docs.find((d) => d.id === activeId) ?? null;
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return docs
      .filter((d) => filter === "hepsi" || d.kind === filter)
      .filter((d) => !q || `${d.number} ${d.buyer.name}`.toLocaleLowerCase("tr-TR").includes(q))
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [docs, filter, query]);

  const stats = useMemo(() => {
    const sum = (pred: (d: Doc) => boolean) => docs.filter(pred).reduce((a, d) => a + docTotals(d).grandTotal, 0);
    return {
      open: sum((d) => d.kind === "teklif" && (d.status === "taslak" || d.status === "gonderildi")),
      paid: sum((d) => d.kind === "fatura" && d.status === "odendi"),
      due: sum((d) => d.kind === "fatura" && d.status !== "odendi"),
    };
  }, [docs]);

  const update = (doc: Doc) => {
    setDocs((all) => all.map((d) => (d.id === doc.id ? { ...doc, updatedAt: Date.now() } : d)));
    saveSeller(doc.seller);
  };
  const create = (kind: DocKind) => {
    const d = newDoc(docs, kind, loadSeller());
    setDocs((all) => [d, ...all]);
    setActiveId(d.id);
  };
  const duplicate = (doc: Doc) => {
    const copy = { ...newDoc(docs, doc.kind, doc.seller), buyer: { ...doc.buyer }, items: doc.items.map((i) => ({ ...i, id: uid() })),
      discountPercent: doc.discountPercent, notes: doc.notes, currency: doc.currency };
    setDocs((all) => [copy, ...all]);
    setActiveId(copy.id);
  };
  const toInvoice = (doc: Doc) => {
    const inv = quoteToInvoice(docs, doc);
    setDocs((all) => [inv, ...all.map((d) => (d.id === doc.id ? { ...d, status: "kabul" as const } : d))]);
    setActiveId(inv.id);
  };
  const remove = (doc: Doc) => {
    if (!confirm(`${doc.number} silinsin mi?`)) return;
    const rest = docs.filter((d) => d.id !== doc.id);
    setDocs(rest);
    setActiveId(rest[0]?.id ?? null);
  };
  const m = (c: number) => formatMoney(c, "TRY");

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><span className="logo">₺</span> Teklif</div>
        <div className="new">
          <button className="primary" onClick={() => create("teklif")}>+ Teklif</button>
          <button onClick={() => create("fatura")}>+ Fatura</button>
        </div>
        <div className="stats">
          <div><small>Açık teklifler</small><b>{m(stats.open)}</b></div>
          <div><small>Tahsil edilen</small><b className="ok">{m(stats.paid)}</b></div>
          <div><small>Bekleyen fatura</small><b className="warn">{m(stats.due)}</b></div>
        </div>
        <input className="search" placeholder="Ara: numara, müşteri…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="tabs">
          {(["hepsi", "teklif", "fatura"] as Filter[]).map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
              {f === "hepsi" ? "Tümü" : f === "teklif" ? "Teklifler" : "Faturalar"}
            </button>
          ))}
        </div>
        <ul className="list">
          {visible.map((d) => (
            <li key={d.id} className={d.id === activeId ? "on" : ""} onClick={() => setActiveId(d.id)}>
              <div className="l1"><b>{d.number}</b><span className={`st ${d.status}`}>{STATUS_LABEL[d.status]}</span></div>
              <div className="l2"><span>{d.buyer.name || "İsimsiz müşteri"}</span><span>{formatMoney(docTotals(d).grandTotal, d.currency)}</span></div>
            </li>
          ))}
          {!visible.length && <li className="empty">Belge yok</li>}
        </ul>
        <footer className="side-foot">Veriler yalnızca bu tarayıcıda saklanır.</footer>
      </aside>

      {active ? (
        <main className="main">
          <div className="toolbar">
            <h2>{active.kind === "teklif" ? "Fiyat teklifi" : "Fatura"} · {active.number}</h2>
            <div className="acts">
              {active.kind === "teklif" && <button onClick={() => toInvoice(active)}>Faturaya dönüştür</button>}
              <button onClick={() => duplicate(active)}>Kopyala</button>
              <button onClick={() => remove(active)}>Sil</button>
              <button className="primary" onClick={() => window.print()}>PDF / Yazdır</button>
            </div>
          </div>
          <div className="split">
            <Editor doc={active} onChange={update} />
            <div className="preview-wrap"><Preview doc={active} /></div>
          </div>
        </main>
      ) : (
        <main className="main blank"><p>Başlamak için soldan yeni bir teklif ya da fatura oluşturun.</p></main>
      )}
    </div>
  );
}
