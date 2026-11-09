"use client";

import { CalendarDays, Plus, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { OrderOption, previewInputClass } from "./preview-data";

type Appointment = {
  id: string;
  client: string;
  reference: string;
  type: string;
  date: string;
  time: string;
  status: "Confirmed" | "Needs confirmation" | "Completed";
  note: string;
};

const initialAppointments: Appointment[] = [
  { id: "appointment-1", client: "Zara Adeyemi", reference: "CV-2046", type: "Final fitting", date: "2026-11-08", time: "10:30", status: "Confirmed", note: "Bring the beaded clutch for styling." },
  { id: "appointment-2", client: "Amara Okafor", reference: "CV-2048", type: "Progress fitting", date: "2026-11-06", time: "14:00", status: "Needs confirmation", note: "Check sleeve length and hem." },
  { id: "appointment-3", client: "Nneka Williams", reference: "CV-2047", type: "First fitting", date: "2026-11-12", time: "11:00", status: "Confirmed", note: "Confirm the occasionwear silhouette." },
  { id: "appointment-4", client: "Tomi Adebayo", reference: "CV-2044", type: "Pickup", date: "2026-10-30", time: "15:30", status: "Completed", note: "Order collected." },
];

const today = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));

export default function AppointmentsPreview({
  orders,
  onNotice,
}: {
  orders: OrderOption[];
  onNotice: (message: string) => void;
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [client, setClient] = useState(orders[0]?.client ?? "");
  const [reference, setReference] = useState("");
  const [type, setType] = useState("Consultation");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [note, setNote] = useState("");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return appointments
      .filter((appointment) =>
        [appointment.client, appointment.type, appointment.reference, appointment.status]
          .join(" ").toLowerCase().includes(query),
      )
      .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
  }, [appointments, search]);

  function addAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppointments((current) => [{
      id: `appointment-${Date.now()}`,
      client,
      reference,
      type,
      date,
      time,
      status: "Needs confirmation",
      note: note.trim(),
    }, ...current]);
    setDate("");
    setNote("");
    setAdding(false);
    setSearch("");
    onNotice("Sample appointment added; mark it confirmed when agreed.");
  }

  function advanceStatus(id: string) {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id
          ? {
              ...appointment,
              status:
                appointment.status === "Needs confirmation"
                  ? "Confirmed"
                  : appointment.status === "Confirmed"
                    ? "Completed"
                    : "Confirmed",
            }
          : appointment,
      ),
    );
    onNotice("Sample appointment status updated.");
  }

  const upcoming = appointments.filter((appointment) => appointment.date >= today() && appointment.status !== "Completed").length;
  const awaiting = appointments.filter((appointment) => appointment.status === "Needs confirmation").length;

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ad6d7f]">Your workroom</p><h1 className="mt-2 font-serif text-3xl text-[#3d2c32] sm:text-4xl">Appointments & fittings</h1><p className="mt-2 text-sm text-[#837773]">Plan consultations, fittings, and pickups around each commission.</p></div>
        <button className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-[#a43c68] px-5 text-sm font-semibold text-white" onClick={() => setAdding((value) => !value)} type="button"><Plus className="h-4 w-4" />{adding ? "Close form" : "Book appointment"}</button>
      </header>
      <section aria-label="Appointment overview" className="grid gap-3 sm:grid-cols-3">
        {[["Upcoming fittings", upcoming, "Still on the calendar"], ["Needs confirmation", awaiting, "Follow up with these clients"], ["Appointments", appointments.length, "Across this sample calendar"]].map(([label, value, caption]) => <article className="rounded-2xl border border-[#eee5e0] bg-white p-5" key={String(label)}><p className="text-xs text-[#887b75]">{label}</p><p className="mt-3 font-serif text-3xl text-[#43343a]">{value}</p><p className="mt-2 text-[11px] text-[#a0928c]">{caption}</p></article>)}
      </section>
      {adding && <form className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={addAppointment}>
        <label className="text-xs font-semibold text-[#67595a]">Client<select className={previewInputClass} onChange={(event) => setClient(event.target.value)} value={client}>{Array.from(new Set([...orders.map((order) => order.client), client].filter(Boolean))).map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className="text-xs font-semibold text-[#67595a]">Appointment type<select className={previewInputClass} onChange={(event) => setType(event.target.value)} value={type}><option>Consultation</option><option>First fitting</option><option>Progress fitting</option><option>Final fitting</option><option>Pickup</option></select></label>
        <label className="text-xs font-semibold text-[#67595a]">Order (optional)<select className={previewInputClass} onChange={(event) => setReference(event.target.value)} value={reference}><option value="">No order linked</option>{orders.map((order) => <option key={order.reference} value={order.reference}>{order.reference} · {order.client}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-[#67595a]">Date<input className={previewInputClass} min={today()} onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></label><label className="text-xs font-semibold text-[#67595a]">Time<input className={previewInputClass} onChange={(event) => setTime(event.target.value)} required type="time" value={time} /></label></div>
        <label className="text-xs font-semibold text-[#67595a] sm:col-span-2 lg:col-span-4">Fitting notes<input className={previewInputClass} onChange={(event) => setNote(event.target.value)} value={note} /></label>
        <button className="min-h-10 rounded-full bg-[#a43c68] px-5 text-xs font-semibold text-white sm:col-span-2 lg:col-span-4" type="submit">Save sample appointment</button>
      </form>}
      <section className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-[#f0e9e5] p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#a43c68]" /><h2 className="font-serif text-xl text-[#43343a]">Fitting calendar</h2></div><label className="relative block sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99992]" /><input aria-label="Search appointments" className="h-10 w-full rounded-xl border border-[#eee5e0] pl-9 pr-3 text-sm outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search appointments" type="search" value={search} /></label></div>
        <div className="divide-y divide-[#f2ece8]">{visible.map((appointment) => <article className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5" key={appointment.id}><div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#fbf0f4] text-[#9c4a6a]"><span className="text-[9px] font-semibold uppercase">{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${appointment.date}T12:00:00`))}</span><span className="font-serif text-lg leading-5">{new Date(`${appointment.date}T12:00:00`).getDate()}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#493b3e]">{appointment.type} · {appointment.client}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${appointment.status === "Confirmed" ? "bg-[#edf4ef] text-[#52715d]" : appointment.status === "Completed" ? "bg-[#f0efeb] text-[#716a5b]" : "bg-[#fff3e7] text-[#9a6223]"}`}>{appointment.status}</span></div><p className="mt-1 text-xs text-[#968781]">{formatDate(appointment.date)} · {appointment.time}{appointment.reference ? ` · ${appointment.reference}` : ""}</p>{appointment.note && <p className="mt-2 text-xs text-[#887b75]">{appointment.note}</p>}</div>{appointment.status !== "Completed" && <button className="min-h-9 self-start rounded-full border border-[#ead1da] px-3 text-xs font-semibold text-[#9c3d66] sm:self-center" onClick={() => advanceStatus(appointment.id)} type="button">{appointment.status === "Needs confirmation" ? "Mark confirmed" : "Mark completed"}</button>}</article>)}</div>
        <p className="border-t border-[#f0e9e5] px-5 py-3 text-xs text-[#988982]">{visible.length} appointments · Sample data</p>
      </section>
    </section>
  );
}
