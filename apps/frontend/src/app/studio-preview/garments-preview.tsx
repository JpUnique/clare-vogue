"use client";

import { ChevronRight, Plus, Search, Shirt } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Garment, Order, OrderStatus } from "./preview-data";
import { previewInputClass, statusStyles } from "./preview-data";

export default function GarmentsPreview({
  orders,
  onAddGarment,
  onOpenOrder,
}: {
  orders: Order[];
  onAddGarment: (orderId: string, garment: Omit<Garment, "id">) => void;
  onOpenOrder: (orderId: string, garmentId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [orderId, setOrderId] = useState(orders[0]?.id ?? "");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Eveningwear");
  const garments = useMemo(
    () => orders.flatMap((order) => order.garments.map((garment) => ({ ...garment, order })))
      .filter((entry) => `${entry.name} ${entry.category} ${entry.order.client} ${entry.order.reference}`.toLowerCase().includes(search.trim().toLowerCase())),
    [orders, search],
  );

  function addGarment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAddGarment(orderId, { name: name.trim(), category, stage: "Design & measurements", progress: 12, color: "#b54773" });
    setName("");
    setAdding(false);
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ad6d7f]">Your workroom</p><h1 className="mt-2 font-serif text-3xl text-[#3d2c32] sm:text-4xl">Garment collection</h1><p className="mt-2 text-sm text-[#837773]">Every piece, from the first measurements to the final fitting.</p></div><button className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-[#a43c68] px-5 text-sm font-semibold text-white" onClick={() => setAdding((value) => !value)} type="button"><Plus className="h-4 w-4" />{adding ? "Close form" : "Add garment"}</button></header>
      {adding && <form className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-3" onSubmit={addGarment}><label className="text-xs font-semibold text-[#67595a]">Order<select className={previewInputClass} onChange={(event) => setOrderId(event.target.value)} required value={orderId}>{orders.map((order) => <option key={order.id} value={order.id}>{order.reference} · {order.client}</option>)}</select></label><label className="text-xs font-semibold text-[#67595a]">Garment name<input className={previewInputClass} onChange={(event) => setName(event.target.value)} required value={name} /></label><label className="text-xs font-semibold text-[#67595a]">Category<select className={previewInputClass} onChange={(event) => setCategory(event.target.value)} value={category}><option>Eveningwear</option><option>Occasionwear</option><option>Daywear</option><option>Tailoring</option><option>Accessory</option></select></label><button className="min-h-10 rounded-full bg-[#a43c68] px-5 text-xs font-semibold text-white sm:col-span-3" type="submit">Save sample garment</button></form>}
      <section className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-[#f0e9e5] p-4 sm:flex-row sm:items-center"><div><h2 className="font-serif text-xl text-[#43343a]">All garments</h2><p className="mt-1 text-xs text-[#968781]">Browse every piece across your sample orders.</p></div><label className="relative block sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99992]" /><input aria-label="Search garments" className="h-10 w-full rounded-xl border border-[#eee5e0] pl-9 pr-3 text-sm outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search garments" type="search" value={search} /></label></div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{garments.map(({ order, ...garment }) => <button className="group rounded-2xl border border-[#eee5e0] p-4 text-left transition hover:border-[#dcb8c4] hover:bg-[#fdf9f9]" key={garment.id} onClick={() => onOpenOrder(order.id, garment.id)} type="button"><div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fbf0f4] text-[#a43c68]"><Shirt className="h-5 w-5" /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[order.status as OrderStatus]}`}>{order.status}</span></div><h3 className="mt-4 font-serif text-lg text-[#493b3e]">{garment.name}</h3><p className="mt-1 text-xs text-[#968781]">{garment.category} · {order.client}</p><div className="mt-4 flex justify-between text-[11px]"><span className="text-[#8f807a]">{garment.stage}</span><span className="font-semibold text-[#9c4a6a]">{garment.progress}%</span></div><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#f0eae6]"><span className="block h-full rounded-full bg-[#b8587d]" style={{ width: `${garment.progress}%` }} /></span><span className="mt-4 flex items-center justify-between border-t border-[#f1e9e4] pt-3 text-[11px] text-[#9b8c86]"><span>{order.reference}</span><span className="inline-flex items-center gap-1 font-semibold text-[#a43c68]">View order <ChevronRight className="h-3.5 w-3.5" /></span></span></button>)}{garments.length === 0 && <p className="p-8 text-center text-sm text-[#968781] sm:col-span-2 xl:col-span-3">No garments match that search.</p>}</div>
        <p className="border-t border-[#f0e9e5] px-5 py-3 text-xs text-[#988982]">{garments.length} garments · Sample data</p>
      </section>
    </section>
  );
}
