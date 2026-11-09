"use client";

import { Plus, Search, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { previewInputClass } from "./preview-data";
import type { OrderOption } from "./preview-data";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  since: string;
};

const initialCustomers: Customer[] = [
  { id: "2048", name: "Amara Okafor", phone: "+234 800 000 2048", email: "amara@example.test", note: "Prefers a morning fitting.", since: "Oct 2026" },
  { id: "2047", name: "Nneka Williams", phone: "+234 800 000 2047", email: "nneka@example.test", note: "Occasionwear client.", since: "Oct 2026" },
  { id: "2046", name: "Zara Adeyemi", phone: "+234 800 000 2046", email: "zara@example.test", note: "Final fitting booked this month.", since: "Sep 2026" },
  { id: "2045", name: "Maya Thompson", phone: "+234 800 000 2045", email: "maya@example.test", note: "Linen and daywear commissions.", since: "Sep 2026" },
  { id: "2044", name: "Tomi Adebayo", phone: "+234 800 000 2044", email: "tomi@example.test", note: "Collected her celebration set.", since: "Aug 2026" },
];

export default function CustomersPreview({
  orders,
  onNotice,
}: {
  orders: OrderOption[];
  onNotice: (message: string) => void;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email, customer.note]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [customers, search]);

  function addCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomers((current) => [
      { id: `new-${Date.now()}`, name: name.trim(), phone: phone.trim(), email: email.trim(), note: note.trim() || "No notes yet.", since: "Nov 2026" },
      ...current,
    ]);
    setName("");
    setPhone("");
    setEmail("");
    setNote("");
    setSearch("");
    setAdding(false);
    onNotice("Sample customer added to this preview.");
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ad6d7f]">Your workroom</p>
          <h1 className="mt-2 font-serif text-3xl text-[#3d2c32] sm:text-4xl">Customer directory</h1>
          <p className="mt-2 text-sm text-[#837773]">Keep client contact details and useful preferences together.</p>
        </div>
        <button className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-[#a43c68] px-5 text-sm font-semibold text-white" onClick={() => setAdding((value) => !value)} type="button">
          <Plus className="h-4 w-4" /> {adding ? "Close form" : "Add customer"}
        </button>
      </header>
      <section aria-label="Customer overview" className="grid gap-3 sm:grid-cols-3">
        {[
          ["Clients in directory", customers.length, "Across this sample workroom"],
          ["Active commissions", orders.length, "Linked to sample orders"],
          ["Customers with notes", customers.filter((customer) => customer.note !== "No notes yet.").length, "Preferences recorded"],
        ].map(([label, value, noteText]) => (
          <article className="rounded-2xl border border-[#eee5e0] bg-white p-5" key={String(label)}>
            <p className="text-xs text-[#887b75]">{label}</p>
            <p className="mt-3 font-serif text-3xl text-[#43343a]">{value}</p>
            <p className="mt-2 text-[11px] text-[#a0928c]">{noteText}</p>
          </article>
        ))}
      </section>
      {adding && (
        <form className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={addCustomer}>
          <label className="text-xs font-semibold text-[#67595a]">Client name<input className={previewInputClass} onChange={(event) => setName(event.target.value)} required value={name} /></label>
          <label className="text-xs font-semibold text-[#67595a]">Phone<input className={previewInputClass} onChange={(event) => setPhone(event.target.value)} required type="tel" value={phone} /></label>
          <label className="text-xs font-semibold text-[#67595a]">Email<input className={previewInputClass} onChange={(event) => setEmail(event.target.value)} type="email" value={email} /></label>
          <label className="text-xs font-semibold text-[#67595a]">Notes / preferences<input className={previewInputClass} onChange={(event) => setNote(event.target.value)} value={note} /></label>
          <button className="min-h-10 rounded-full bg-[#a43c68] px-5 text-xs font-semibold text-white sm:col-span-2 lg:col-span-4" type="submit">Save sample customer</button>
        </form>
      )}
      <section className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-[#f0e9e5] p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#a43c68]" /><h2 className="font-serif text-xl text-[#43343a]">Customers</h2></div>
          <label className="relative block sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99992]" /><input aria-label="Search customers" className="h-10 w-full rounded-xl border border-[#eee5e0] pl-9 pr-3 text-sm outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" type="search" value={search} /></label>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCustomers.map((customer) => {
            const count = orders.filter((order) => order.client === customer.name).length;
            return (
              <article className="rounded-2xl border border-[#eee5e0] p-4" key={customer.id}>
                <h3 className="font-semibold text-[#493b3e]">{customer.name}</h3>
                <p className="mt-1 text-xs text-[#968781]">Client since {customer.since}</p>
                <div className="mt-4 space-y-2 border-t border-[#f1e9e4] pt-3 text-xs text-[#756a68]">
                  <p>{customer.phone}</p><p className="break-all">{customer.email || "No email provided"}</p><p className="leading-5 text-[#968781]">{customer.note}</p>
                </div>
                <p className="mt-3 rounded-xl bg-[#fcf8f6] px-3 py-2 text-xs text-[#887b75]">Sample commissions <strong className="float-right text-[#9c4a6a]">{count}</strong></p>
              </article>
            );
          })}
          {visibleCustomers.length === 0 && <p className="p-8 text-center text-sm text-[#968781] sm:col-span-2 xl:col-span-3">No customers match that search.</p>}
        </div>
        <p className="border-t border-[#f0e9e5] px-5 py-3 text-xs text-[#988982]">{visibleCustomers.length} customers · Sample data</p>
      </section>
    </section>
  );
}
