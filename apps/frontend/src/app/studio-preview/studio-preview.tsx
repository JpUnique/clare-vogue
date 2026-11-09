"use client";

import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  MessageCircleHeart,
  PackageSearch,
  Ruler,
  Shirt,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import AppointmentsPreview from "./appointments-preview";
import ClientStoriesPreview from "./client-stories-preview";
import CustomersPreview from "./customers-preview";
import GarmentsPreview from "./garments-preview";
import ItemsPreview from "./items-preview";
import MeasurementsPreview from "./measurements-preview";
import OrdersPreview from "./orders-preview";
import PaymentsPreview from "./payments-preview";
import { initialOrders } from "./preview-data";
import type { Garment, Order, OrderStatus } from "./preview-data";

type View =
  | "orders"
  | "garments"
  | "items"
  | "stories"
  | "customers"
  | "appointments"
  | "measurements"
  | "payments";

const navigationItems = [
  { key: "orders", label: "Orders", icon: CalendarDays },
  { key: "garments", label: "Garments", icon: Shirt },
  { key: "items", label: "Items", icon: PackageSearch },
  { key: "stories", label: "Client stories", icon: MessageCircleHeart },
  { key: "customers", label: "Customers", icon: Users },
  { key: "appointments", label: "Appointments", icon: Clock3 },
  { key: "measurements", label: "Measurements", icon: Ruler },
  { key: "payments", label: "Payments", icon: CircleDollarSign },
] as const;

const viewLabels: Record<View, string> = {
  orders: "Orders",
  garments: "Garments",
  items: "Items",
  stories: "Client stories",
  customers: "Customers",
  appointments: "Appointments",
  measurements: "Measurements",
  payments: "Payments",
};

export default function StudioPreview() {
  const [orders, setOrders] = useState(initialOrders);
  const [activeView, setActiveView] = useState<View>("orders");
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrders[0].id);
  const [selectedGarmentId, setSelectedGarmentId] = useState(
    initialOrders[0].garments[0].id,
  );
  const [toast, setToast] = useState("");
  const reduceMotion = useReducedMotion() ?? false;
  const orderOptions = orders.map(({ reference, client, garments }) => ({
    reference,
    client,
    garments: garments.map(({ id, name }) => ({ id, name })),
  }));

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function createOrder(input: {
    client: string;
    title: string;
    dueDate: string;
  }) {
    const latestReferenceNumber = Math.max(
      2043,
      ...orders.map((order) => Number(order.reference.replace("CV-", ""))),
    );
    const order: Order = {
      id: `order-${Date.now()}`,
      reference: `CV-${latestReferenceNumber + 1}`,
      client: input.client,
      title: input.title,
      dueDate: input.dueDate
        ? new Intl.DateTimeFormat("en", {
            month: "short",
            day: "numeric",
          }).format(new Date(`${input.dueDate}T12:00:00`))
        : "Date not set",
      status: "In progress",
      garments: [],
    };
    setOrders((current) => [order, ...current]);
    setSelectedOrderId(order.id);
    setSelectedGarmentId("");
    setActiveView("orders");
    showToast("Sample order added to this preview.");
  }

  function addGarment(orderId: string, garment: Omit<Garment, "id">) {
    const newGarment = { ...garment, id: `garment-${Date.now()}` };
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? { ...order, garments: [...order.garments, newGarment] }
          : order,
      ),
    );
    setSelectedOrderId(orderId);
    setSelectedGarmentId(newGarment.id);
    showToast("Sample garment added to this preview.");
  }

  function changeOrderStatus(status: OrderStatus) {
    setOrders((current) =>
      current.map((order) =>
        order.id === selectedOrderId ? { ...order, status } : order,
      ),
    );
    showToast(`Sample order marked ${status.toLowerCase()}.`);
  }

  function openOrder(orderId: string, garmentId: string) {
    setSelectedOrderId(orderId);
    setSelectedGarmentId(garmentId);
    setActiveView("orders");
  }

  function renderScreen() {
    switch (activeView) {
      case "orders":
        return (
          <OrdersPreview
            orders={orders}
            selectedOrderId={selectedOrderId}
            selectedGarmentId={selectedGarmentId}
            onSelectOrder={(id) => {
              const selected = orders.find((order) => order.id === id);
              setSelectedOrderId(id);
              setSelectedGarmentId(selected?.garments[0]?.id ?? "");
            }}
            onSelectGarment={setSelectedGarmentId}
            onCreateOrder={createOrder}
            onChangeStatus={changeOrderStatus}
            onOpenStories={() => setActiveView("stories")}
          />
        );
      case "garments":
        return (
          <GarmentsPreview
            orders={orders}
            onAddGarment={addGarment}
            onOpenOrder={openOrder}
          />
        );
      case "items":
        return (
          <ItemsPreview
            onNotice={showToast}
            orders={orders.map(({ reference, client }) => ({ reference, client }))}
          />
        );
      case "stories":
        return <ClientStoriesPreview onNotice={showToast} orders={orderOptions} />;
      case "customers":
        return (
          <CustomersPreview
            onNotice={showToast}
            orders={orders.map(({ reference, client }) => ({
              reference,
              client,
              garments: [],
            }))}
          />
        );
      case "appointments":
        return (
          <AppointmentsPreview
            onNotice={showToast}
            orders={orders.map(({ reference, client }) => ({
              reference,
              client,
              garments: [],
            }))}
          />
        );
      case "measurements":
        return (
          <MeasurementsPreview
            onNotice={showToast}
            orders={orders.map(({ reference, client }) => ({
              reference,
              client,
              garments: [],
            }))}
          />
        );
      case "payments":
        return (
          <PaymentsPreview
            onNotice={showToast}
            orders={orders.map(({ reference, client }) => ({
              reference,
              client,
              garments: [],
            }))}
          />
        );
    }
  }

  return (
    <main className="min-h-screen bg-[#faf7f3] text-[#342a2c]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 flex-col border-r border-[#eee5e0] bg-white px-5 py-7 lg:flex">
          <Link className="flex items-center gap-3" href="/">
            <Image
              src="/clare-vogue-logo.png"
              alt="Clare's Vogue"
              width={56}
              height={56}
              className="h-12 w-12 rounded-full border border-[#eee0dc] object-cover"
            />
            <span>
              <span className="block font-serif text-lg leading-tight text-[#432d37]">
                Clare&apos;s Vogue
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a17d62]">
                The atelier
              </span>
            </span>
          </Link>
          <div className="mt-10">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a89a92]">
              Workroom
            </p>
            <nav aria-label="Studio preview" className="mt-3 space-y-1">
              {navigationItems.map(({ key, label, icon: Icon }) => (
                <button
                  aria-current={activeView === key ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    activeView === key
                      ? "bg-[#f9eef3] text-[#a33c68]"
                      : "text-[#756a68] hover:bg-[#faf7f3]"
                  }`}
                  key={key}
                  onClick={() => setActiveView(key)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <div className="mt-auto rounded-2xl border border-[#f0e2d5] bg-gradient-to-br from-[#fffaf2] to-[#f9edf2] p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#b58a54] shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="mt-3 font-serif text-base text-[#493740]">Made with care</p>
            <p className="mt-1 text-xs leading-5 text-[#83756f]">
              Every detail, fitting, and finish belongs to a story.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-[#eee5e0] bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <Image
                  src="/clare-vogue-logo.png"
                  alt="Clare's Vogue"
                  width={44}
                  height={44}
                  className="h-10 w-10 rounded-full border border-[#eee0dc] object-cover"
                />
                <span className="truncate font-serif text-lg text-[#432d37]">
                  Clare&apos;s Vogue
                </span>
              </div>
              <div className="hidden items-center gap-2 text-sm text-[#9b8c86] lg:flex">
                <span>Atelier</span>
                <span aria-hidden="true">/</span>
                <span className="font-medium text-[#514145]">
                  {viewLabels[activeView]}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-3 sm:gap-5">
                <div className="hidden items-center gap-2 rounded-full border border-[#efe7e2] bg-[#fcfaf8] px-3 py-2 text-xs text-[#8c7c78] sm:flex">
                  <span className="h-2 w-2 rounded-full bg-[#b8587d]" />
                  Preview mode
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ecd9dc] bg-[#fbf0f3] text-xs font-semibold text-[#9d4c68]">
                  CV
                </div>
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-9 xl:px-10">
            <nav
              aria-label="Studio preview"
              className="mb-5 grid grid-cols-2 gap-2 lg:hidden"
            >
              {navigationItems.map(({ key, label, icon: Icon }) => (
                <button
                  aria-current={activeView === key ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${
                    activeView === key
                      ? "border-[#ead1da] bg-[#f9eef3] text-[#a33c68]"
                      : "border-[#eee5e0] bg-white text-[#756a68]"
                  }`}
                  key={key}
                  onClick={() => setActiveView(key)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#ead6b2] bg-[#fff9ed] px-4 py-3 text-sm text-[#7b6342]">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#b28a4b]" />
              <p>
                <span className="font-semibold">Design preview.</span> This
                workroom uses sample records only. Interactions update this
                preview in memory; nothing is saved or sent to a server.
              </p>
            </div>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeView}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                >
                  {renderScreen()}
                </motion.div>
              </AnimatePresence>
              <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#eee5e0] pt-5 text-[11px] text-[#a0938c] sm:flex-row sm:items-center">
                <span>Clare&apos;s Vogue Atelier · A little care in every detail</span>
                <span>Design preview · Sample records only</span>
              </footer>
            </motion.div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#44353d] px-5 py-3 text-sm font-medium text-white shadow-xl"
            exit={{ opacity: 0, y: 6 }}
            initial={{ opacity: 0, y: 6 }}
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
