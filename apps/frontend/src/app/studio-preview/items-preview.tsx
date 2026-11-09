"use client";

import {
  ArrowDown,
  Check,
  ChevronDown,
  CircleDollarSign,
  PackageCheck,
  PackagePlus,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type PurchaseStatus = "To buy" | "Ordered" | "Received";

type PurchaseItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier: string;
  orderReference: string;
  status: PurchaseStatus;
};

type OrderOption = {
  reference: string;
  client: string;
};

type ItemsPreviewProps = {
  orders: OrderOption[];
  onNotice: (message: string) => void;
};

type ItemFilter = "All items" | PurchaseStatus;

const initialItems: PurchaseItem[] = [
  {
    id: "material-1",
    name: "Aso-oke fabric",
    category: "Fabric",
    quantity: 6,
    unit: "yards",
    unitPrice: 18500,
    supplier: "Lagos Textile House",
    orderReference: "CV-2048",
    status: "To buy",
  },
  {
    id: "material-2",
    name: "Silk lining",
    category: "Fabric",
    quantity: 4,
    unit: "yards",
    unitPrice: 6200,
    supplier: "Lagos Textile House",
    orderReference: "CV-2046",
    status: "To buy",
  },
  {
    id: "material-3",
    name: "Invisible zips",
    category: "Fastenings",
    quantity: 5,
    unit: "pieces",
    unitPrice: 1800,
    supplier: "Market supplies",
    orderReference: "CV-2048",
    status: "Ordered",
  },
  {
    id: "material-4",
    name: "Glass seed beads",
    category: "Embellishment",
    quantity: 3,
    unit: "packs",
    unitPrice: 9800,
    supplier: "Bead & Trim Co.",
    orderReference: "CV-2047",
    status: "Received",
  },
  {
    id: "material-5",
    name: "All-purpose thread",
    category: "Notions",
    quantity: 8,
    unit: "spools",
    unitPrice: 2200,
    supplier: "Market supplies",
    orderReference: "",
    status: "To buy",
  },
  {
    id: "material-6",
    name: "Fusible interfacing",
    category: "Notions",
    quantity: 2,
    unit: "yards",
    unitPrice: 4500,
    supplier: "Market supplies",
    orderReference: "CV-2047",
    status: "Ordered",
  },
];

const itemFilters: ItemFilter[] = ["All items", "To buy", "Ordered", "Received"];
const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[#eee5e0] bg-white px-3 text-sm font-normal text-[#493b3e] outline-none transition placeholder:text-[#b4a7a0] focus:border-[#c98ba0] focus:ring-2 focus:ring-[#a43c68]/10";

const statusClass: Record<PurchaseStatus, string> = {
  "To buy": "bg-[#fff3e7] text-[#9a6223]",
  Ordered: "bg-[#f1edf8] text-[#725990]",
  Received: "bg-[#edf4ef] text-[#52715d]",
};

function formatNaira(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ItemsPreview({ orders, onNotice }: ItemsPreviewProps) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<ItemFilter>("All items");
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Fabric");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("yards");
  const [unitPrice, setUnitPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = filter === "All items" || item.status === filter;
      const matchesQuery =
        !query ||
        [
          item.name,
          item.category,
          item.supplier,
          item.orderReference,
        ].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [filter, items, search]);

  const toBuyTotal = items
    .filter((item) => item.status === "To buy")
    .reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  const orderedTotal = items
    .filter((item) => item.status === "Ordered")
    .reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  const receivedCount = items.filter(
    (item) => item.status === "Received",
  ).length;

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(unitPrice);
    if (!Number.isFinite(price) || price < 0) {
      onNotice("Enter a valid Naira unit price.");
      return;
    }

    const nextItem: PurchaseItem = {
      id: `item-${Date.now()}`,
      name: name.trim(),
      category,
      quantity: Number(quantity),
      unit,
      unitPrice: price,
      supplier: supplier.trim() || "Supplier not set",
      orderReference,
      status: "To buy",
    };
    setItems((current) => [nextItem, ...current]);
    setFilter("All items");
    setSearch("");
    setName("");
    setCategory("Fabric");
    setQuantity("1");
    setUnit("yards");
    setUnitPrice("");
    setSupplier("");
    setOrderReference("");
    setIsAdding(false);
    onNotice("Sample item added to this preview.");
  }

  function changeStatus(itemId: string, nextStatus: PurchaseStatus) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, status: nextStatus } : item,
      ),
    );
    setOpenActionId(null);
    onNotice(`Sample item marked ${nextStatus.toLowerCase()}.`);
  }

  return (
    <motion.section
      key="items-view"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      className="space-y-5"
    >
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ad6d7f]">
          Your workroom
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-[#3d2c32] sm:text-4xl">
          Items to purchase
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#837773]">
          Track supplies to buy, prices in Naira, and the client order each item
          belongs to.
        </p>
      </header>
      <section
        aria-label="Purchase overview"
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          {
            label: "Still to buy",
            value: formatNaira(toBuyTotal),
            note: `${items.filter((item) => item.status === "To buy").length} items on the list`,
            icon: ShoppingBag,
            tint: "bg-[#fff3e7] text-[#9a6223]",
          },
          {
            label: "Ordered",
            value: formatNaira(orderedTotal),
            note: `${items.filter((item) => item.status === "Ordered").length} items on the way`,
            icon: ArrowDown,
            tint: "bg-[#f1edf8] text-[#725990]",
          },
          {
            label: "Received",
            value: receivedCount,
            note: "Items marked as received",
            icon: PackageCheck,
            tint: "bg-[#edf4ef] text-[#52715d]",
          },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.label}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.25,
                delay: reduceMotion ? 0 : index * 0.04,
              }}
              className="rounded-2xl border border-[#eee5e0] bg-white p-4 shadow-[0_10px_30px_-26px_rgba(61,44,50,.35)] sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-[#887b75]">
                    {item.label}
                  </p>
                  <p className="mt-3 font-serif text-2xl text-[#43343a] sm:text-3xl">
                    {item.value}
                  </p>
                </div>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tint}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-[11px] text-[#a0928c]">{item.note}</p>
            </motion.article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white shadow-[0_16px_44px_-38px_rgba(61,44,50,.35)]">
        <div className="border-b border-[#f0e9e5] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#a43c68]" />
                <h2 className="font-serif text-xl text-[#43343a]">
                  Atelier purchase list
                </h2>
              </div>
              <p className="mt-1 text-xs text-[#968781]">
                Keep track of supplies, costs, and the orders they belong to.
              </p>
            </div>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full bg-[#a43c68] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#8e3158] sm:self-auto"
              onClick={() => setIsAdding((current) => !current)}
              type="button"
            >
              {isAdding ? <ArrowDown className="h-4 w-4 rotate-180" /> : <PackagePlus className="h-4 w-4" />}
              {isAdding ? "Close form" : "Add an item"}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {isAdding && (
              <motion.form
                animate={{ opacity: 1, height: "auto", y: 0 }}
                className="mt-5 grid gap-3 rounded-2xl border border-[#f0e2e5] bg-[#fdf9f8] p-4 sm:grid-cols-2 lg:grid-cols-4"
                exit={{ opacity: 0, height: 0, y: -6 }}
                initial={{ opacity: 0, height: 0, y: -6 }}
                onSubmit={addItem}
              >
                <label className="block text-xs font-semibold text-[#67595a] sm:col-span-2">
                  Item name
                  <input
                    className={inputClass}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Cotton lining"
                    required
                    value={name}
                  />
                </label>
                <label className="block text-xs font-semibold text-[#67595a]">
                  Category
                  <select
                    className={inputClass}
                    onChange={(event) => setCategory(event.target.value)}
                    value={category}
                  >
                    <option>Fabric</option>
                    <option>Fastenings</option>
                    <option>Embellishment</option>
                    <option>Notions</option>
                    <option>Packaging</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-[#67595a]">
                  Supplier
                  <input
                    className={inputClass}
                    onChange={(event) => setSupplier(event.target.value)}
                    placeholder="Shop or supplier"
                    value={supplier}
                  />
                </label>
                <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
                  <label className="block text-xs font-semibold text-[#67595a]">
                    Quantity
                    <input
                      className={inputClass}
                      min="1"
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                      step="1"
                      type="number"
                      value={quantity}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#67595a]">
                    Unit
                    <select
                      className={inputClass}
                      onChange={(event) => setUnit(event.target.value)}
                      value={unit}
                    >
                      <option>yards</option>
                      <option>metres</option>
                      <option>pieces</option>
                      <option>packs</option>
                      <option>spools</option>
                      <option>sets</option>
                    </select>
                  </label>
                </div>
                <label className="block text-xs font-semibold text-[#67595a]">
                  Unit price (NGN)
                  <span className="relative block">
                    <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a18a77]" />
                    <input
                      className={`${inputClass} pl-9`}
                      min="0"
                      onChange={(event) => setUnitPrice(event.target.value)}
                      placeholder="0"
                      required
                      step="1"
                      type="number"
                      value={unitPrice}
                    />
                  </span>
                </label>
                <label className="block text-xs font-semibold text-[#67595a] sm:col-span-2">
                  Link to an order (optional)
                  <select
                    className={inputClass}
                    onChange={(event) => setOrderReference(event.target.value)}
                    value={orderReference}
                  >
                    <option value="">Shared atelier stock</option>
                    {orders.map((order) => (
                      <option key={order.reference} value={order.reference}>
                        {order.reference} · {order.client}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end sm:col-span-2 lg:col-span-4">
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4b3941] px-4 text-sm font-semibold text-white transition hover:bg-[#392a31]"
                    type="submit"
                  >
                    <Check className="h-4 w-4" />
                    Add to sample list
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div aria-label="Filter purchase items" className="flex gap-2 overflow-x-auto pb-1">
              {itemFilters.map((itemFilter) => (
                <button
                  aria-pressed={filter === itemFilter}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition ${
                    filter === itemFilter
                      ? "bg-[#4b3941] text-white"
                      : "bg-[#f7f3f0] text-[#827570] hover:bg-[#f1e9e4]"
                  }`}
                  key={itemFilter}
                  onClick={() => setFilter(itemFilter)}
                  type="button"
                >
                  {itemFilter}
                  <span className="ml-1.5 opacity-65">
                    {itemFilter === "All items"
                      ? items.length
                      : items.filter((item) => item.status === itemFilter).length}
                  </span>
                </button>
              ))}
            </div>
            <label className="relative block sm:w-[230px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99992]" />
              <input
                className="h-10 w-full rounded-xl border border-[#eee5e0] bg-[#fdfbf9] pl-9 pr-3 text-sm outline-none transition placeholder:text-[#b4a7a0] focus:border-[#d3a3b3] focus:ring-2 focus:ring-[#a43c68]/10"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search purchase list"
                type="search"
                value={search}
              />
            </label>
          </div>
        </div>

        <div className="divide-y divide-[#f2ece8]">
          {filteredItems.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Search className="mx-auto h-5 w-5 text-[#b49c9e]" />
              <p className="mt-3 font-medium text-[#54474a]">
                No items match that search
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <article
                className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.3fr)_0.8fr_0.65fr_auto] sm:items-center sm:px-5"
                key={item.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8f0ed] text-[#a66a69]">
                    <ShoppingBag className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#493b3e]">
                      {item.name}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-[#9b8c86]">
                      {item.category} · {item.supplier}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs sm:block">
                  <span className="text-[#837773]">
                    {item.quantity} {item.unit} × {formatNaira(item.unitPrice)}
                  </span>
                  <span className="font-semibold text-[#55474a] sm:mt-1 sm:block">
                    {formatNaira(item.quantity * item.unitPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 sm:block">
                  <span className="min-w-0 truncate text-[11px] text-[#958781]">
                    {item.orderReference || "Shared atelier stock"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass[item.status]}`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="relative flex justify-end">
                  <button
                    aria-expanded={openActionId === item.id}
                    aria-label={`Update ${item.name} purchase status`}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#eee5e0] px-3 text-xs font-medium text-[#766966] transition hover:bg-[#faf7f3]"
                    onClick={() =>
                      setOpenActionId((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    type="button"
                  >
                    Update
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <AnimatePresence>
                    {openActionId === item.id && (
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute right-0 top-10 z-10 w-40 rounded-xl border border-[#eee5e0] bg-white p-1.5 shadow-xl"
                        exit={{ opacity: 0, y: -4 }}
                        initial={{ opacity: 0, y: -4 }}
                      >
                        {item.status !== "To buy" && (
                          <button
                            className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#746762] hover:bg-[#faf7f3]"
                            onClick={() => changeStatus(item.id, "To buy")}
                            type="button"
                          >
                            Mark to buy
                          </button>
                        )}
                        {item.status !== "Ordered" && (
                          <button
                            className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#746762] hover:bg-[#faf7f3]"
                            onClick={() => changeStatus(item.id, "Ordered")}
                            type="button"
                          >
                            Mark ordered
                          </button>
                        )}
                        {item.status !== "Received" && (
                          <button
                            className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#746762] hover:bg-[#faf7f3]"
                            onClick={() => changeStatus(item.id, "Received")}
                            type="button"
                          >
                            Mark received
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-[#f0e9e5] bg-[#fdfbf9] px-4 py-3 text-[11px] text-[#968781] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>
            {items.length} sample {items.length === 1 ? "item" : "items"} ·{" "}
            {formatNaira(items.reduce(
              (total, item) => total + item.quantity * item.unitPrice,
              0,
            ))}{" "}
            estimated total
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#b28a4b]" />
            Preview only · Naira prices are examples
          </span>
        </div>
      </section>
    </motion.section>
  );
}
