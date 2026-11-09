"use client";

import { CircleDollarSign, Plus, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { OrderOption } from "./preview-data";
import { previewInputClass } from "./preview-data";

type Payment = {
  id: string;
  client: string;
  reference: string;
  description: string;
  total: number;
  paid: number;
  dueDate: string;
};

const initialPayments: Payment[] = [
  { id: "p-1", client: "Amara Okafor", reference: "CV-2048", description: "The Aso-Oke Edit · deposit", total: 185000, paid: 100000, dueDate: "2026-11-14" },
  { id: "p-2", client: "Nneka Williams", reference: "CV-2047", description: "A Modern Heirloom · deposit", total: 240000, paid: 0, dueDate: "2026-11-18" },
  { id: "p-3", client: "Zara Adeyemi", reference: "CV-2046", description: "Soft Gold Occasionwear · balance", total: 165000, paid: 165000, dueDate: "2026-11-08" },
  { id: "p-4", client: "Tomi Adebayo", reference: "CV-2044", description: "The Celebration Set · final payment", total: 215000, paid: 215000, dueDate: "2026-10-30" },
];

const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
const paymentStatus = (payment: Payment) =>
  payment.paid >= payment.total ? "Paid" : payment.paid > 0 ? "Part paid" : "Awaiting payment";
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));

export default function PaymentsPreview({
  orders,
  onNotice,
}: {
  orders: OrderOption[];
  onNotice: (message: string) => void;
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [reference, setReference] = useState(orders[0]?.reference ?? "");
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("0");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter((payment) =>
      [payment.client, payment.reference, payment.description, paymentStatus(payment)]
        .join(" ").toLowerCase().includes(query),
    );
  }, [payments, search]);

  function addPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(total);
    const received = Number(paid);
    const order = orders.find((candidate) => candidate.reference === reference);
    if (!order || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(received) || received < 0 || received > amount) {
      onNotice("Choose an order and enter valid payment amounts.");
      return;
    }
    setPayments((current) => [{
      id: `p-${Date.now()}`,
      client: order.client,
      reference: order.reference,
      description: description.trim() || "Order payment",
      total: amount,
      paid: received,
      dueDate: new Date().toISOString().slice(0, 10),
    }, ...current]);
    setDescription("");
    setTotal("");
    setPaid("0");
    setSearch("");
    setAdding(false);
    onNotice("Sample payment record added to this preview.");
  }

  function markPaid(id: string) {
    setPayments((current) => current.map((payment) => payment.id === id ? { ...payment, paid: payment.total } : payment));
    onNotice("Sample payment marked as paid.");
  }

  const recorded = payments.reduce((sum, payment) => sum + payment.total, 0);
  const collected = payments.reduce((sum, payment) => sum + payment.paid, 0);

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ad6d7f]">Your workroom</p><h1 className="mt-2 font-serif text-3xl text-[#3d2c32] sm:text-4xl">Payments</h1><p className="mt-2 text-sm text-[#837773]">Track order totals, deposits, balances, and what has been paid.</p></div><button className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-[#a43c68] px-5 text-sm font-semibold text-white" onClick={() => setAdding((value) => !value)} type="button"><Plus className="h-4 w-4" />{adding ? "Close form" : "Record payment"}</button></header>
      <section aria-label="Payment overview" className="grid gap-3 sm:grid-cols-3">{[["Total recorded", formatNaira(recorded)], ["Collected", formatNaira(collected)], ["Outstanding", formatNaira(recorded - collected)]].map(([label, amount]) => <article className="rounded-2xl border border-[#eee5e0] bg-white p-5" key={label}><p className="text-xs text-[#887b75]">{label}</p><p className="mt-3 font-serif text-2xl text-[#43343a] sm:text-3xl">{amount}</p><p className="mt-2 text-[11px] text-[#a0928c]">Sample Naira amounts</p></article>)}</section>
      {adding && <form className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={addPayment}><label className="text-xs font-semibold text-[#67595a] sm:col-span-2">Order<select className={previewInputClass} onChange={(event) => setReference(event.target.value)} required value={reference}>{orders.map((order) => <option key={order.reference} value={order.reference}>{order.reference} · {order.client}</option>)}</select></label><label className="text-xs font-semibold text-[#67595a] sm:col-span-2">Payment description<input className={previewInputClass} onChange={(event) => setDescription(event.target.value)} placeholder="Deposit, fitting, or final balance" value={description} /></label><label className="text-xs font-semibold text-[#67595a]">Amount due (NGN)<input className={previewInputClass} min="1" onChange={(event) => setTotal(event.target.value)} required step="1" type="number" value={total} /></label><label className="text-xs font-semibold text-[#67595a]">Amount received (NGN)<input className={previewInputClass} min="0" onChange={(event) => setPaid(event.target.value)} required step="1" type="number" value={paid} /></label><button className="min-h-10 rounded-full bg-[#a43c68] px-5 text-xs font-semibold text-white sm:col-span-2 lg:col-span-4" type="submit">Save sample payment</button></form>}
      <section className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white"><div className="flex flex-col justify-between gap-3 border-b border-[#f0e9e5] p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-[#a43c68]" /><h2 className="font-serif text-xl text-[#43343a]">Payment register</h2></div><label className="relative block sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99992]" /><input aria-label="Search payments" className="h-10 w-full rounded-xl border border-[#eee5e0] pl-9 pr-3 text-sm outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search payments" type="search" value={search} /></label></div>
        <div className="divide-y divide-[#f2ece8]">{visible.map((payment) => {const balance = Math.max(0, payment.total - payment.paid); const status = paymentStatus(payment); return <article className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5" key={payment.id}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8f2e7] text-[#9c7741]"><CircleDollarSign className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#493b3e]">{payment.client} · {payment.reference}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${status === "Paid" ? "bg-[#edf4ef] text-[#52715d]" : status === "Part paid" ? "bg-[#f1edf8] text-[#725990]" : "bg-[#fff3e7] text-[#9a6223]"}`}>{status}</span></div><p className="mt-1 text-xs text-[#968781]">{payment.description} · Due {formatDate(payment.dueDate)}</p></div><div className="text-left text-xs sm:min-w-32 sm:text-right"><p className="font-semibold text-[#493b3e]">{formatNaira(payment.total)}</p><p className="mt-1 text-[#968781]">{balance ? `${formatNaira(balance)} balance` : "Fully paid"}</p></div>{balance > 0 && <button className="min-h-9 self-start rounded-full border border-[#ead1da] px-3 text-xs font-semibold text-[#9c3d66] sm:self-center" onClick={() => markPaid(payment.id)} type="button">Mark paid</button>}</article>;})}{visible.length === 0 && <p className="p-8 text-center text-sm text-[#968781]">No payment records match that search.</p>}</div>
        <p className="border-t border-[#f0e9e5] px-5 py-3 text-xs text-[#988982]">{visible.length} payment records · Sample data</p></section>
    </section>
  );
}
