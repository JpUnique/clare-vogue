"use client";

import { Plus, Ruler, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { previewInputClass } from "./preview-data";
import type { OrderOption } from "./preview-data";

type Measurement = {
  id: string;
  client: string;
  garment: string;
  date: string;
  unit: "cm" | "in";
  values: Record<string, number>;
};

const fields = ["Bust", "Waist", "Hips", "Shoulder", "Sleeve", "Garment length"];
const initialMeasurements: Measurement[] = [
  { id: "m-1", client: "Amara Okafor", garment: "Ceremony two-piece", date: "2026-10-28", unit: "cm", values: { Bust: 92, Waist: 74, Hips: 101, Shoulder: 39, Sleeve: 59, "Garment length": 146 } },
  { id: "m-2", client: "Zara Adeyemi", garment: "Draped satin dress", date: "2026-10-24", unit: "cm", values: { Bust: 88, Waist: 70, Hips: 96, Shoulder: 37, Sleeve: 57, "Garment length": 139 } },
  { id: "m-3", client: "Nneka Williams", garment: "Bespoke occasion gown", date: "2026-10-20", unit: "in", values: { Bust: 36, Waist: 29, Hips: 40, Shoulder: 15, Sleeve: 23, "Garment length": 56 } },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));

export default function MeasurementsPreview({
  orders,
  onNotice,
}: {
  orders: OrderOption[];
  onNotice: (message: string) => void;
}) {
  const [records, setRecords] = useState(initialMeasurements);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [client, setClient] = useState(orders[0]?.client ?? "");
  const [garment, setGarment] = useState("");
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [values, setValues] = useState<Record<string, string>>({});
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => `${record.client} ${record.garment}`.toLowerCase().includes(query));
  }, [records, search]);

  function addMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Object.fromEntries(fields.map((field) => [field, Number(values[field])]));
    if (fields.some((field) => !Number.isFinite(parsed[field]) || parsed[field] <= 0)) {
      onNotice("Enter a positive value for every measurement.");
      return;
    }
    setRecords((current) => [{ id: `m-${Date.now()}`, client, garment: garment.trim(), date: new Date().toISOString().slice(0, 10), unit, values: parsed }, ...current]);
    setGarment("");
    setValues({});
    setAdding(false);
    setSearch("");
    onNotice("Sample measurement record added to this preview.");
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ad6d7f]">Your workroom</p><h1 className="mt-2 font-serif text-3xl text-[#3d2c32] sm:text-4xl">Measurement book</h1><p className="mt-2 text-sm text-[#837773]">Keep dated, garment-specific sizing notes beside each client.</p></div><button className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-[#a43c68] px-5 text-sm font-semibold text-white" onClick={() => setAdding((value) => !value)} type="button"><Plus className="h-4 w-4" />{adding ? "Close form" : "Add measurements"}</button></header>
      <section aria-label="Measurement overview" className="grid gap-3 sm:grid-cols-3">{[["Measurement records", records.length], ["Clients measured", new Set(records.map((record) => record.client)).size], ["Units used", `${records.filter((record) => record.unit === "cm").length} cm · ${records.filter((record) => record.unit === "in").length} in`]].map(([label, value]) => <article className="rounded-2xl border border-[#eee5e0] bg-white p-5" key={String(label)}><p className="text-xs text-[#887b75]">{label}</p><p className="mt-3 font-serif text-3xl text-[#43343a]">{value}</p><p className="mt-2 text-[11px] text-[#a0928c]">Sample records only</p></article>)}</section>
      {adding && <form className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={addMeasurement}><label className="text-xs font-semibold text-[#67595a]">Client<select className={previewInputClass} onChange={(event) => setClient(event.target.value)} value={client}>{Array.from(new Set([...orders.map((order) => order.client), client].filter(Boolean))).map((name) => <option key={name}>{name}</option>)}</select></label><label className="text-xs font-semibold text-[#67595a]">Garment / fitting<input className={previewInputClass} onChange={(event) => setGarment(event.target.value)} required value={garment} /></label><label className="text-xs font-semibold text-[#67595a]">Unit<select className={previewInputClass} onChange={(event) => setUnit(event.target.value as "cm" | "in")} value={unit}><option value="cm">Centimetres (cm)</option><option value="in">Inches (in)</option></select></label>{fields.map((field) => <label className="text-xs font-semibold text-[#67595a]" key={field}>{field} ({unit})<input className={previewInputClass} min="0.1" onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} required step="0.1" type="number" value={values[field] ?? ""} /></label>)}<button className="min-h-10 rounded-full bg-[#a43c68] px-5 text-xs font-semibold text-white sm:col-span-2 lg:col-span-4" type="submit">Save sample measurements</button></form>}
      <section className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white"><div className="flex flex-col justify-between gap-3 border-b border-[#f0e9e5] p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-2"><Ruler className="h-4 w-4 text-[#a43c68]" /><h2 className="font-serif text-xl text-[#43343a]">Client measurements</h2></div><label className="relative block sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99992]" /><input aria-label="Search measurements" className="h-10 w-full rounded-xl border border-[#eee5e0] pl-9 pr-3 text-sm outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search measurements" type="search" value={search} /></label></div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((record) => <article className="rounded-2xl border border-[#eee5e0] p-4" key={record.id}><div className="flex justify-between gap-3"><div><h3 className="font-semibold text-[#493b3e]">{record.client}</h3><p className="mt-1 text-xs text-[#968781]">{record.garment}</p></div><span className="rounded-full bg-[#f8f2e7] px-2.5 py-1 text-[10px] font-semibold text-[#9c7741]">{record.unit}</span></div><p className="mt-3 text-[11px] text-[#a0928c]">Recorded {formatDate(record.date)}</p><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#f1e9e4] pt-3 text-xs">{fields.map((field) => <div className="flex justify-between gap-2" key={field}><dt className="text-[#968781]">{field}</dt><dd className="font-semibold text-[#5b4b4e]">{record.values[field]} {record.unit}</dd></div>)}</dl></article>)}{visible.length === 0 && <p className="p-8 text-center text-sm text-[#968781] sm:col-span-2 xl:col-span-3">No measurement records match that search.</p>}</div>
        <p className="border-t border-[#f0e9e5] px-5 py-3 text-xs text-[#988982]">{visible.length} records · Sample data</p></section>
    </section>
  );
}
