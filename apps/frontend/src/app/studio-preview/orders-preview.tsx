"use client";

import { ChevronRight, Plus, Search, Shirt } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Garment, Order, OrderStatus } from "./preview-data";
import { getInitials, previewInputClass, statusStyles } from "./preview-data";

const filters = ["All orders", "In progress", "Needs attention", "Ready", "Complete"] as const;
type Filter = (typeof filters)[number];

export default function OrdersPreview({
  orders,
  selectedOrderId,
  selectedGarmentId,
  onSelectOrder,
  onSelectGarment,
  onCreateOrder,
  onChangeStatus,
  onOpenStories,
}: {
  orders: Order[];
  selectedOrderId: string;
  selectedGarmentId: string;
  onSelectOrder: (id: string) => void;
  onSelectGarment: (id: string) => void;
  onCreateOrder: (order: { client: string; title: string; dueDate: string }) => void;
  onChangeStatus: (status: OrderStatus) => void;
  onOpenStories: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("All orders");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [client, setClient] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const byStatus =
        filter === "All orders" ||
        (filter === "Ready"
          ? order.status === "Ready for fitting"
          : order.status === filter);
      return byStatus && [order.reference, order.client, order.title].some((value) => value.toLowerCase().includes(query));
    });
  }, [filter, orders, search]);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? visibleOrders[0];
  const selectedGarment =
    selectedOrder?.garments.find((garment) => garment.id === selectedGarmentId) ??
    selectedOrder?.garments[0];

  function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateOrder({ client: client.trim(), title: title.trim(), dueDate });
    setClient("");
    setTitle("");
    setDueDate("");
    setAdding(false);
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ad6d7f]">Your workroom</p><h1 className="mt-2 font-serif text-3xl text-[#3d2c32] sm:text-4xl">Orders & garments</h1><p className="mt-2 text-sm text-[#837773]">A calm overview of every client commission, fitting, and piece in progress.</p></div>
        <button className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-[#a43c68] px-5 text-sm font-semibold text-white" onClick={() => setAdding((value) => !value)} type="button"><Plus className="h-4 w-4" />{adding ? "Close form" : "New order"}</button>
      </header>
      <section aria-label="Atelier overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["Active orders", orders.filter((order) => order.status !== "Complete").length], ["Pieces in progress", orders.reduce((count, order) => count + order.garments.filter((garment) => garment.progress < 100).length, 0)], ["Fittings this week", 3], ["Need attention", orders.filter((order) => order.status === "Needs attention").length]].map(([label, value]) => <article className="rounded-2xl border border-[#eee5e0] bg-white p-5" key={String(label)}><p className="text-xs text-[#887b75]">{label}</p><p className="mt-3 font-serif text-3xl text-[#43343a]">{value}</p><p className="mt-2 text-[11px] text-[#a0928c]">Sample workroom</p></article>)}
      </section>
      {adding && <form className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-3" onSubmit={saveOrder}><label className="text-xs font-semibold text-[#67595a]">Client name<input className={previewInputClass} onChange={(event) => setClient(event.target.value)} required value={client} /></label><label className="text-xs font-semibold text-[#67595a]">Order name<input className={previewInputClass} onChange={(event) => setTitle(event.target.value)} required value={title} /></label><label className="text-xs font-semibold text-[#67595a]">Due date<input className={previewInputClass} onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} /></label><button className="min-h-10 rounded-full bg-[#a43c68] px-5 text-xs font-semibold text-white sm:col-span-3" type="submit">Create sample order</button></form>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white">
          <div className="border-b border-[#f0e9e5] p-4">
            <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99992]" /><input aria-label="Search orders" className="h-10 w-full rounded-xl border border-[#eee5e0] pl-9 pr-3 text-sm outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search client or order" type="search" value={search} /></label>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button aria-pressed={filter === item} className={`shrink-0 rounded-full px-3 py-2 text-xs ${filter === item ? "bg-[#4b3941] text-white" : "bg-[#f7f3f0] text-[#827570]"}`} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}</div>
          </div>
          <div className="divide-y divide-[#f2ece8]">{visibleOrders.map((order) => <button aria-pressed={selectedOrder?.id === order.id} className={`flex w-full items-center gap-3 px-4 py-4 text-left ${selectedOrder?.id === order.id ? "bg-[#fcf6f7]" : "hover:bg-[#fdfbf9]"}`} key={order.id} onClick={() => onSelectOrder(order.id)} type="button"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7eaf0] text-xs font-semibold text-[#a14d6b]">{getInitials(order.client)}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#493b3e]">{order.client}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyles[order.status]}`}>{order.status}</span></span><span className="mt-1 block truncate text-xs text-[#988982]">{order.reference} · {order.title}</span></span><span className="hidden text-right text-xs text-[#887b75] sm:block">{order.garments.length} pieces<br />Due {order.dueDate}</span><ChevronRight className="h-4 w-4 text-[#b4a4a0]" /></button>)}{visibleOrders.length === 0 && <p className="p-8 text-center text-sm text-[#968781]">No matching orders.</p>}</div>
          <p className="border-t border-[#f0e9e5] px-5 py-3 text-xs text-[#988982]">Showing {visibleOrders.length} of {orders.length} sample orders</p>
        </section>
        <section aria-label="Selected order details" className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white">
          {selectedOrder ? <><div className="border-b border-[#f0e9e5] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad6d7f]">{selectedOrder.reference}</p><h2 className="mt-1 font-serif text-2xl text-[#43343a]">{selectedOrder.title}</h2><p className="mt-1 text-sm text-[#887b75]">{selectedOrder.client}</p><label className="mt-4 block text-xs font-semibold text-[#67595a]">Order status<select className={previewInputClass} onChange={(event) => onChangeStatus(event.target.value as OrderStatus)} value={selectedOrder.status}><option>In progress</option><option>Needs attention</option><option>Ready for fitting</option><option>Complete</option></select></label></div><div className="p-5"><div className="flex items-center justify-between"><h3 className="font-serif text-lg text-[#493b3e]">Garments</h3><span className="text-xs text-[#968781]">{selectedOrder.garments.length} pieces</span></div><div className="mt-3 space-y-2">{selectedOrder.garments.map((garment: Garment) => <button aria-pressed={selectedGarment?.id === garment.id} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selectedGarment?.id === garment.id ? "border-[#dcb8c4] bg-[#fdf9f9]" : "border-[#eee5e0]"}`} key={garment.id} onClick={() => onSelectGarment(garment.id)} type="button"><Shirt className="h-4 w-4 shrink-0 text-[#a43c68]" /><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-[#493b3e]">{garment.name}</strong><span className="mt-1 block text-[11px] text-[#968781]">{garment.stage}</span></span><span className="text-xs font-semibold text-[#9c4a6a]">{garment.progress}%</span></button>)}</div>{selectedGarment && <div className="mt-4 border-t border-[#f0e9e5] pt-4"><p className="text-xs text-[#887b75]">Next step · {selectedGarment.stage}</p><button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#a43c68]" onClick={onOpenStories} type="button">Client stories <ChevronRight className="h-3.5 w-3.5" /></button></div>}</div></> : <p className="p-8 text-center text-sm text-[#968781]">Choose an order to see its garments.</p>}
        </section>
      </div>
    </section>
  );
}
