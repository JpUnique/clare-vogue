"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  ImagePlus,
  PackageSearch,
  Ruler,
  Shirt,
  Users,
} from "lucide-react";

type ApiRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  internalNotes: string | null;
  archivedAt: string | null;
};

type Measurement = {
  id: string;
  customerId: string;
  measuredAt: string;
  unit: "cm" | "in";
  bust: string | null;
  waist: string | null;
  hips: string | null;
  shoulderWidth: string | null;
  shoulderToWaist: string | null;
  sleeveLength: string | null;
  armhole: string | null;
  desiredDressLength: string | null;
  customMeasurements: { name: string; value: string }[];
  notes: string | null;
};

type Garment = {
  id: string;
  orderId: string;
  customerId: string;
  description: string;
  stage: string;
  agreedPrice: string | null;
  dueDate: string | null;
  blockedAt: string | null;
  blockingReason: string | null;
  financials: {
    allocatedAmount: string;
    refundedAmount: string;
    netPaidAmount: string;
    balanceDue: string | null;
  };
};

type Order = {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  summary: {
    status: string;
    garmentCount: number;
    activeCount: number;
    blockedCount: number;
    totalAgreedPrice: string;
  };
  garments: Garment[];
};

type PurchaseItem = {
  id: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  supplier: string | null;
  status: "to_buy" | "ordered" | "received";
  orderId: string | null;
  orderReference: string | null;
};

type Appointment = {
  id: string;
  customerId: string;
  customerName: string;
  orderId: string | null;
  orderReference: string | null;
  garmentId: string | null;
  type: string;
  scheduledAt: string;
  status: "needs_confirmation" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
};

type ClientStory = {
  id: string;
  customerId: string;
  customerName: string;
  orderId: string;
  orderReference: string;
  garmentId: string;
  garmentName: string;
  mediaId: string;
  rating: number;
  feedback: string;
  createdAt: string;
  videoAvailable: boolean;
  videoUrl?: string;
  consent?: ConsentEvent[];
};

type ConsentEvent = {
  id: string;
  action: "granted" | "withdrawn";
  method: "verbal" | "written" | "electronic" | null;
  occurredAt: string;
  note: string | null;
};

type Payment = {
  id: string;
  amount: string;
  method: string;
  reference: string | null;
  note: string | null;
  receivedAt: string;
  status: "active" | "voided";
  void: { id: string; reason: string; createdAt: string } | null;
  allocatedAmount: string;
  unallocatedAmount: string;
  allocations: {
    id: string;
    garmentId: string;
    amount: string;
    active: boolean;
    reversal: { id: string; reason: string } | null;
  }[];
};

type Fitting = {
  id: string;
  outcome: "pending" | "approved" | "alterations_required";
  completedAt: string;
  requestedAlterations: string | null;
  notes: string | null;
};

type DeliveryEvent = {
  id: string;
  eventType: "delivered" | "reversed";
  reversesDeliveryEventId: string | null;
  method: "customer_collection" | "physical_delivery" | null;
  recipientName: string | null;
  notes: string | null;
  occurredAt: string | null;
  balanceAtDelivery: string | null;
  agreementTerms: string | null;
  agreedFollowUpAt: string | null;
  correctionReason: string | null;
};

type PriceEvent = {
  id: string;
  previousPrice: string | null;
  newPrice: string;
  reason: string;
  createdAt: string;
};

type CancellationSettlement = {
  id: string;
  amountToRefund: string;
  amountRetained: string;
  reason: string;
  customerAgreement: string;
  refundRecorded: string;
  refundOutstanding: string;
  refunds: {
    id: string;
    amount: string;
    method: string;
    reference: string | null;
    refundedAt: string;
    note: string | null;
  }[];
};

type GarmentHistory = {
  fittings: Fitting[];
  deliveries: DeliveryEvent[];
  prices: PriceEvent[];
  settlement: CancellationSettlement | null;
};

const screens = [
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "garments", label: "Garments", icon: Shirt },
  { id: "items", label: "Items", icon: PackageSearch },
  { id: "stories", label: "Client stories", icon: ImagePlus },
  { id: "customers", label: "Customers", icon: Users },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "measurements", label: "Measurements", icon: Ruler },
  { id: "payments", label: "Payments", icon: CircleDollarSign },
] as const;

type Screen = (typeof screens)[number]["id"];

const stages = [
  "request_confirmed",
  "measurements_recorded",
  "material_pending",
  "ready_to_cut",
  "cutting",
  "sewing",
  "customer_fitting",
  "alterations",
  "dry_cleaning",
  "packaging",
  "ready_for_delivery",
  "payment_check",
  "customer_notified",
  "delivery_arranged",
] as const;

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[#eee5e0] bg-white px-3 text-sm text-[#493b3e] outline-none focus:border-[#c98ba0] focus:ring-2 focus:ring-[#a43c68]/10";
const labelClass = "block text-xs font-semibold text-[#67595a]";
const buttonClass =
  "min-h-10 rounded-full bg-[#a43c68] px-5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function display(value: string) {
  return value.replaceAll("_", " ");
}

function money(value: string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function examplesFor(screen: Screen) {
  const examples: Record<Screen, string[]> = {
    orders: [
      "Example: start an order by choosing an existing customer.",
      "Add garments and set each piece’s due date and agreed price.",
      "Order progress is calculated from the garments it contains.",
    ],
    garments: [
      "Example stages: cutting → sewing → fitting → packaging.",
      "Record a fitting outcome separately from a scheduled appointment.",
      "Use a blocker when work cannot continue; resume it when resolved.",
    ],
    items: [
      "Example: Aso-oke fabric · 6 yards · ₦18,500 per yard.",
      "Link supplies to an order when they belong to one commission.",
      "Move items from To buy to Ordered to Received.",
    ],
    stories: [
      "Upload a private MP4 or MOV video to its garment.",
      "Record a 1–5 satisfaction rating and the customer’s feedback.",
      "A story stays private unless portfolio consent is separately recorded.",
    ],
    customers: [
      "Example: save contact details and fitting preferences.",
      "Use a customer’s record when creating orders and appointments.",
      "Measurements are dated records; add a new set instead of overwriting.",
    ],
    appointments: [
      "Example types: consultation, fitting, or pickup.",
      "Link an appointment to the customer and, optionally, an order/garment.",
      "Mark it confirmed, completed, or cancelled as the plan changes.",
    ],
    measurements: [
      "Record a dated set in centimetres or inches.",
      "Standard fields include bust, waist, hips, shoulder and sleeve.",
      "Measurements are private customer records.",
    ],
    payments: [
      "Record each payment against an order.",
      "Optionally allocate part of a payment to one garment.",
      "Balances are calculated from prices, payments, and allocations.",
    ],
  };
  return examples[screen];
}

export default function LiveWorkroom({
  request,
  displayName,
}: {
  request: ApiRequest;
  displayName: string;
}) {
  const [screen, setScreen] = useState<Screen>("orders");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stories, setStories] = useState<ClientStory[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [garmentHistory, setGarmentHistory] = useState<
    Record<string, GarmentHistory>
  >({});
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resourceErrors, setResourceErrors] = useState<string[]>([]);

  const loadMain = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      request<Customer[]>("/customers?limit=100&offset=0"),
      request<Omit<Order, "garments">[]>("/orders?limit=100&offset=0"),
      request<PurchaseItem[]>("/purchase-items"),
      request<Appointment[]>("/appointments"),
      request<ClientStory[]>("/client-stories"),
    ]);
    const failures: string[] = [];
    const [
      customerResult,
      orderResult,
      itemResult,
      appointmentResult,
      storyResult,
    ] = results;

    if (customerResult.status === "fulfilled") {
      setCustomers(customerResult.value);
      setSelectedCustomerId(
        (current) => current || customerResult.value[0]?.id || "",
      );
    } else failures.push(`Customers: ${messageOf(customerResult.reason)}`);

    if (orderResult.status === "fulfilled") {
      const withGarments = await Promise.all(
        orderResult.value.map(async (order) => ({
          ...order,
          garments: await request<Garment[]>(
            `/orders/${encodeURIComponent(order.id)}/garments`,
          ),
        })),
      ).catch((cause: unknown) => {
        failures.push(`Garments: ${messageOf(cause)}`);
        return [];
      });
      setOrders(withGarments);
      setSelectedOrderId((current) => current || withGarments[0]?.id || "");
    } else failures.push(`Orders: ${messageOf(orderResult.reason)}`);

    if (itemResult.status === "fulfilled") setItems(itemResult.value);
    else failures.push(`Purchase list: ${messageOf(itemResult.reason)}`);

    if (appointmentResult.status === "fulfilled")
      setAppointments(appointmentResult.value);
    else failures.push(`Appointments: ${messageOf(appointmentResult.reason)}`);

    if (storyResult.status === "fulfilled") {
      const withUrls = await Promise.all(
        storyResult.value.map(async (story) => {
          if (!story.videoAvailable) return story;
          const [download, consent] = await Promise.all([
            request<{ downloadUrl: string }>(
              `/media/${encodeURIComponent(story.mediaId)}/download-url`,
            ),
            request<ConsentEvent[]>(
              `/media/${encodeURIComponent(story.mediaId)}/portfolio-consent`,
            ),
          ]);
          return { ...story, videoUrl: download.downloadUrl, consent };
        }),
      ).catch((cause: unknown) => {
        failures.push(`Client stories: ${messageOf(cause)}`);
        return storyResult.value;
      });
      setStories(withUrls);
    } else failures.push(`Client stories: ${messageOf(storyResult.reason)}`);

    setResourceErrors(failures);
    setLoading(false);
  }, [request]);

  const loadGarmentHistory = useCallback(
    async (garment: Garment) => {
      const [fittings, deliveries, prices] = await Promise.all([
        request<Fitting[]>(`/garments/${garment.id}/fittings`),
        request<DeliveryEvent[]>(`/garments/${garment.id}/deliveries`),
        request<PriceEvent[]>(`/garments/${garment.id}/price-history`),
      ]);
      let settlement: CancellationSettlement | null = null;
      if (garment.stage === "cancelled") {
        try {
          settlement = await request<CancellationSettlement>(
            `/garments/${garment.id}/cancellation-settlement`,
          );
        } catch (cause) {
          if (
            !messageOf(cause)
              .toLowerCase()
              .includes("cancellation settlement not found")
          ) {
            throw cause;
          }
        }
      }
      setGarmentHistory((current) => ({
        ...current,
        [garment.id]: { fittings, deliveries, prices, settlement },
      }));
    },
    [request],
  );

  const loadPayments = useCallback(async () => {
    if (!selectedOrderId) {
      setPayments([]);
      return;
    }
    try {
      const rows = await request<Payment[]>(
        `/orders/${encodeURIComponent(selectedOrderId)}/payments`,
      );
      setPayments(rows);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [request, selectedOrderId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMain();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMain]);

  useEffect(() => {
    if (screen !== "measurements" || !selectedCustomerId) {
      const timer = window.setTimeout(() => setMeasurements([]), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    void request<Measurement[]>(
      `/customers/${encodeURIComponent(selectedCustomerId)}/measurements`,
    )
      .then((rows) => {
        if (active) setMeasurements(rows);
      })
      .catch((cause: unknown) => {
        if (active) setError(messageOf(cause));
      });
    return () => {
      active = false;
    };
  }, [request, screen, selectedCustomerId]);

  useEffect(() => {
    if (screen !== "payments" || !selectedOrderId) {
      const timer = window.setTimeout(() => setPayments([]), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      void loadPayments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPayments, screen, selectedOrderId]);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) => !["completed", "cancelled"].includes(order.summary.status),
      ),
    [orders],
  );
  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId,
  );

  async function runAction(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      return true;
    } catch (cause) {
      setError(messageOf(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: (form: FormData) => Promise<void>,
    success: string,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;
    const succeeded = await runAction(async () => {
      await action(form);
      await loadMain();
      if (screen === "payments") await loadPayments();
    }, success);
    if (succeeded) formElement.reset();
  }

  function field(
    label: string,
    name: string,
    options: {
      type?: string;
      required?: boolean;
      defaultValue?: string;
      min?: string;
      step?: string;
      maxLength?: number;
      placeholder?: string;
    } = {},
  ) {
    return (
      <label className={labelClass} key={name}>
        {label}
        <input
          className={fieldClass}
          name={name}
          type={options.type ?? "text"}
          required={options.required}
          defaultValue={options.defaultValue}
          min={options.min}
          step={options.step}
          maxLength={options.maxLength}
          placeholder={options.placeholder}
        />
      </label>
    );
  }

  function selectField(
    label: string,
    name: string,
    options: { value: string; label: string }[],
    required = true,
  ) {
    return (
      <label className={labelClass} key={name}>
        {label}
        <select
          className={fieldClass}
          name={name}
          required={required}
          defaultValue=""
        >
          {!required && <option value="">Not linked</option>}
          {required && <option value="">Choose…</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function renderGuidance() {
    return (
      <aside className="rounded-2xl border border-[#ead6b2] bg-[#fff9ed] p-4">
        <p className="text-sm font-semibold text-[#7b6342]">
          A few examples to help you get started
        </p>
        <ul className="mt-2 grid gap-2 text-xs leading-5 text-[#83756f] md:grid-cols-3">
          {examplesFor(screen).map((example) => (
            <li className="rounded-xl bg-white/70 p-3" key={example}>
              {example}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-[#927d60]">
          Examples are guidance only. They are not customer records and will not
          be saved.
        </p>
      </aside>
    );
  }

  function renderCustomers() {
    return (
      <>
        <form
          className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) =>
            submit(
              event,
              async (form) => {
                await request("/customers", {
                  method: "POST",
                  body: JSON.stringify({
                    name: String(form.get("name")),
                    phone: String(form.get("phone") || "") || undefined,
                    email: String(form.get("email") || "") || undefined,
                    internalNotes: String(form.get("internalNotes") || ""),
                  }),
                });
              },
              "Customer saved.",
            )
          }
        >
          {field("Customer name", "name", { required: true, maxLength: 200 })}
          {field("Phone", "phone", { type: "tel", maxLength: 40 })}
          {field("Email", "email", { type: "email", maxLength: 320 })}
          {field("Notes / preferences", "internalNotes", { maxLength: 5000 })}
          <button
            className={`${buttonClass} sm:col-span-2 lg:col-span-4`}
            disabled={busy}
          >
            Add customer
          </button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <article
              className="rounded-2xl border border-[#eee5e0] bg-white p-4"
              key={customer.id}
            >
              <h3 className="font-semibold text-[#493b3e]">{customer.name}</h3>
              <p className="mt-2 text-xs text-[#756a68]">
                {customer.phone || "No phone"} · {customer.email || "No email"}
              </p>
              <p className="mt-2 text-xs leading-5 text-[#968781]">
                {customer.internalNotes || "No preferences recorded."}
              </p>
              <details className="mt-3 border-t border-[#f1e9e4] pt-3">
                <summary className="cursor-pointer text-xs font-semibold text-[#a43c68]">
                  Edit customer details
                </summary>
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(event) =>
                    submit(
                      event,
                      async (form) => {
                        await request(`/customers/${customer.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            name: String(form.get("name")),
                            phone: String(form.get("phone") || "") || null,
                            email: String(form.get("email") || "") || null,
                            internalNotes:
                              String(form.get("internalNotes") || "") || null,
                          }),
                        });
                      },
                      "Customer details updated.",
                    )
                  }
                >
                  <input
                    aria-label="Customer name"
                    className={fieldClass}
                    defaultValue={customer.name}
                    maxLength={200}
                    name="name"
                    required
                  />
                  <input
                    aria-label="Phone"
                    className={fieldClass}
                    defaultValue={customer.phone ?? ""}
                    maxLength={40}
                    name="phone"
                    type="tel"
                  />
                  <input
                    aria-label="Email"
                    className={fieldClass}
                    defaultValue={customer.email ?? ""}
                    maxLength={320}
                    name="email"
                    type="email"
                  />
                  <textarea
                    aria-label="Notes and preferences"
                    className="min-h-20 w-full rounded-xl border border-[#eee5e0] p-3 text-sm"
                    defaultValue={customer.internalNotes ?? ""}
                    maxLength={5000}
                    name="internalNotes"
                  />
                  <button className={buttonClass} disabled={busy} type="submit">
                    Save changes
                  </button>
                </form>
              </details>
              <button
                className="mt-3 rounded-full border border-[#eee5e0] px-3 py-1.5 text-xs"
                disabled={busy || Boolean(customer.archivedAt)}
                onClick={() =>
                  void runAction(async () => {
                    await request(`/customers/${customer.id}/archive`, {
                      method: "POST",
                    });
                    await loadMain();
                  }, "Customer archived.")
                }
                type="button"
              >
                {customer.archivedAt ? "Archived" : "Archive"}
              </button>
            </article>
          ))}
        </div>
      </>
    );
  }

  function renderOrders() {
    return (
      <>
        <form
          className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) =>
            submit(
              event,
              async (form) => {
                await request("/orders", {
                  method: "POST",
                  body: JSON.stringify({
                    customerId: String(form.get("customerId")),
                    garments: [
                      {
                        description: String(form.get("description")),
                        dueDate: form.get("dueDate") || undefined,
                        agreedPrice: form.get("agreedPrice") || undefined,
                        materialSource: "unknown",
                      },
                    ],
                  }),
                });
              },
              "Order and first garment created.",
            )
          }
        >
          {selectField(
            "Customer",
            "customerId",
            customers.map(({ id, name }) => ({ value: id, label: name })),
          )}
          {field("First garment", "description", {
            required: true,
            maxLength: 300,
          })}
          {field("Due date", "dueDate", { type: "date" })}
          {field("Agreed price (NGN)", "agreedPrice", {
            type: "number",
            min: "0",
            step: "0.01",
          })}
          <button
            className={`${buttonClass} sm:col-span-2 lg:col-span-4`}
            disabled={busy || !customers.length}
          >
            Create order
          </button>
        </form>
        <div className="space-y-3">
          {orders.map((order) => (
            <button
              className={`w-full rounded-2xl border bg-white p-4 text-left ${selectedOrderId === order.id ? "border-[#c98ba0]" : "border-[#eee5e0]"}`}
              key={order.id}
              onClick={() => setSelectedOrderId(order.id)}
              type="button"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <strong>
                  {order.reference} · {order.customerName}
                </strong>
                <span className="text-xs capitalize text-[#8a6f78]">
                  {display(order.summary.status)}
                </span>
              </div>
              <span className="mt-1 block text-xs text-[#968781]">
                {order.summary.garmentCount} garments ·{" "}
                {money(order.summary.totalAgreedPrice)}
              </span>
              <span className="mt-2 block text-sm text-[#756a68]">
                {order.garments
                  .map((garment) => garment.description)
                  .join(" · ") || "No garments yet"}
              </span>
            </button>
          ))}
        </div>
        {selectedOrder && (
          <form
            className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-3"
            onSubmit={(event) =>
              submit(
                event,
                async (form) => {
                  await request(`/orders/${selectedOrder.id}/garments`, {
                    method: "POST",
                    body: JSON.stringify({
                      description: String(form.get("description")),
                      dueDate: String(form.get("dueDate") || "") || undefined,
                      agreedPrice:
                        String(form.get("agreedPrice") || "") || undefined,
                    }),
                  });
                },
                "Garment added to the order.",
              )
            }
          >
            <p className="text-sm font-semibold text-[#493b3e] sm:col-span-3">
              Add a garment to {selectedOrder.reference}
            </p>
            {field("Garment description", "description", {
              required: true,
              maxLength: 300,
            })}
            {field("Due date", "dueDate", { type: "date" })}
            {field("Agreed price (NGN)", "agreedPrice", {
              type: "number",
              min: "0",
              step: "0.01",
            })}
            <button className={`${buttonClass} sm:col-span-3`} disabled={busy}>
              Add garment
            </button>
          </form>
        )}
      </>
    );
  }

  function renderGarments() {
    const garments = selectedOrder?.garments ?? [];
    return (
      <>
        <label className={labelClass}>
          Order
          <select
            className={fieldClass}
            onChange={(event) => setSelectedOrderId(event.target.value)}
            value={selectedOrderId}
          >
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.reference} · {order.customerName}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-3">
          {garments.map((garment) => (
            <article
              className="rounded-2xl border border-[#eee5e0] bg-white p-4"
              key={garment.id}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">{garment.description}</h3>
                <span className="text-xs capitalize text-[#a43c68]">
                  {display(garment.stage)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#968781]">
                Due{" "}
                {garment.dueDate
                  ? new Date(garment.dueDate).toLocaleDateString()
                  : "not set"}{" "}
                · Price {money(garment.agreedPrice)} · Balance{" "}
                {money(garment.financials.balanceDue)}
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className={`${labelClass} min-w-52 flex-1`}>
                  Record progress
                  <select
                    className={fieldClass}
                    defaultValue=""
                    onChange={(event) => {
                      const nextStage = event.target.value;
                      if (!nextStage) return;
                      void runAction(async () => {
                        await request(`/garments/${garment.id}/progress`, {
                          method: "POST",
                          body: JSON.stringify({ stage: nextStage }),
                        });
                        await loadMain();
                      }, "Garment progress updated.");
                    }}
                  >
                    <option value="">Choose a stage…</option>
                    {stages.map((stage) => (
                      <option key={stage} value={stage}>
                        {display(stage)}
                      </option>
                    ))}
                  </select>
                </label>
                {garment.blockedAt ? (
                  <button
                    className={buttonClass}
                    disabled={busy}
                    onClick={() =>
                      void runAction(async () => {
                        await request(`/garments/${garment.id}/resume`, {
                          method: "POST",
                        });
                        await loadMain();
                      }, "Garment resumed.")
                    }
                    type="button"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    className="min-h-10 rounded-full border border-[#e6c6d0] px-4 text-xs text-[#a43c68]"
                    disabled={busy}
                    onClick={() => {
                      const reason = window.prompt(
                        "Why is this garment blocked?",
                      );
                      if (!reason?.trim()) return;
                      void runAction(async () => {
                        await request(`/garments/${garment.id}/block`, {
                          method: "POST",
                          body: JSON.stringify({ reason }),
                        });
                        await loadMain();
                      }, "Garment blocker recorded.");
                    }}
                    type="button"
                  >
                    Add blocker
                  </button>
                )}
              </div>
              {garment.blockingReason && (
                <p className="mt-2 text-xs text-[#a43c68]">
                  Blocked: {garment.blockingReason}
                </p>
              )}
              {garment.stage === "customer_fitting" && (
                <form
                  className="mt-4 grid gap-3 rounded-xl bg-[#fcf8f6] p-3 sm:grid-cols-2"
                  onSubmit={(event) =>
                    submit(
                      event,
                      async (form) => {
                        await request(`/garments/${garment.id}/fittings`, {
                          method: "POST",
                          body: JSON.stringify({
                            outcome: String(form.get("outcome")),
                            requestedAlterations:
                              String(form.get("requestedAlterations") || "") ||
                              undefined,
                            notes: String(form.get("notes") || "") || undefined,
                          }),
                        });
                        await loadGarmentHistory(garment);
                      },
                      "Fitting outcome recorded.",
                    )
                  }
                >
                  {selectField(
                    "Fitting outcome",
                    "outcome",
                    ["pending", "approved", "alterations_required"].map(
                      (value) => ({ value, label: display(value) }),
                    ),
                  )}
                  {field("Alterations requested", "requestedAlterations", {
                    maxLength: 5000,
                  })}
                  {field("Fitting notes", "notes", { maxLength: 5000 })}
                  <button
                    className={`${buttonClass} sm:col-span-2`}
                    disabled={busy}
                  >
                    Save fitting result
                  </button>
                </form>
              )}
              {garment.stage === "delivery_arranged" && (
                <form
                  className="mt-4 grid gap-3 rounded-xl bg-[#fcf8f6] p-3 sm:grid-cols-2"
                  onSubmit={(event) =>
                    submit(
                      event,
                      async (form) => {
                        await request(`/garments/${garment.id}/deliveries`, {
                          method: "POST",
                          body: JSON.stringify({
                            method: String(form.get("method")),
                            recipientName:
                              String(form.get("recipientName") || "") ||
                              undefined,
                            notes: String(form.get("notes") || "") || undefined,
                            agreementTerms:
                              String(form.get("agreementTerms") || "") ||
                              undefined,
                            agreedFollowUpAt:
                              String(form.get("agreedFollowUpAt") || "") ||
                              undefined,
                          }),
                        });
                        await loadGarmentHistory(garment);
                      },
                      "Garment delivery recorded.",
                    )
                  }
                >
                  {selectField(
                    "Handover method",
                    "method",
                    ["customer_collection", "physical_delivery"].map(
                      (value) => ({ value, label: display(value) }),
                    ),
                  )}
                  {field("Received by", "recipientName", { maxLength: 200 })}
                  {field("Outstanding-balance agreement", "agreementTerms", {
                    maxLength: 5000,
                    placeholder: "Required if balance remains unpaid",
                  })}
                  {field("Agreed follow-up date", "agreedFollowUpAt", {
                    type: "datetime-local",
                  })}
                  {field("Delivery notes", "notes", { maxLength: 5000 })}
                  <button
                    className={`${buttonClass} sm:col-span-2`}
                    disabled={busy}
                  >
                    Record handover
                  </button>
                </form>
              )}
              {garment.stage !== "cancelled" &&
                garment.stage !== "delivered" && (
                  <button
                    className="mt-3 rounded-full border border-[#e6c6d0] px-4 py-2 text-xs text-[#a43c68]"
                    disabled={busy}
                    onClick={() => {
                      const reason = window.prompt(
                        "Why is this garment being cancelled?",
                      );
                      if (!reason?.trim()) return;
                      void runAction(async () => {
                        await request(`/garments/${garment.id}/cancel`, {
                          method: "POST",
                          body: JSON.stringify({ reason }),
                        });
                        await loadMain();
                      }, "Garment cancelled.");
                    }}
                    type="button"
                  >
                    Cancel garment
                  </button>
                )}
              <details className="mt-4 border-t border-[#f1e9e4] pt-3">
                <summary className="cursor-pointer text-xs font-semibold text-[#a43c68]">
                  Price, fitting, delivery & cancellation history
                </summary>
                <div className="mt-3 space-y-3">
                  <button
                    className="rounded-full border border-[#eee5e0] px-3 py-2 text-xs"
                    disabled={busy}
                    onClick={() =>
                      void runAction(
                        () => loadGarmentHistory(garment),
                        "Garment history loaded.",
                      )
                    }
                    type="button"
                  >
                    Load / refresh history
                  </button>
                  {garment.agreedPrice === null ? (
                    <form
                      className="grid gap-2 sm:grid-cols-3"
                      onSubmit={(event) =>
                        submit(
                          event,
                          async (form) => {
                            await request(`/garments/${garment.id}/price`, {
                              method: "POST",
                              body: JSON.stringify({
                                agreedPrice: String(form.get("agreedPrice")),
                                reason: String(form.get("reason")),
                              }),
                            });
                            await loadMain();
                            await loadGarmentHistory(garment);
                          },
                          "Garment price confirmed.",
                        )
                      }
                    >
                      {field("Confirm agreed price (NGN)", "agreedPrice", {
                        type: "number",
                        min: "0",
                        step: "0.01",
                        required: true,
                      })}
                      {field("Reason", "reason", {
                        required: true,
                        maxLength: 1000,
                      })}
                      <button className={buttonClass} disabled={busy}>
                        Confirm price
                      </button>
                    </form>
                  ) : garment.stage !== "cancelled" ? (
                    <form
                      className="grid gap-2 sm:grid-cols-3"
                      onSubmit={(event) =>
                        submit(
                          event,
                          async (form) => {
                            await request(
                              `/garments/${garment.id}/price-adjustments`,
                              {
                                method: "POST",
                                body: JSON.stringify({
                                  agreedPrice: String(form.get("agreedPrice")),
                                  reason: String(form.get("reason")),
                                }),
                              },
                            );
                            await loadMain();
                            await loadGarmentHistory(garment);
                          },
                          "Garment price adjustment recorded.",
                        )
                      }
                    >
                      {field("New agreed price (NGN)", "agreedPrice", {
                        type: "number",
                        min: "0",
                        step: "0.01",
                        required: true,
                      })}
                      {field("Reason", "reason", {
                        required: true,
                        maxLength: 1000,
                      })}
                      <button className={buttonClass} disabled={busy}>
                        Adjust price
                      </button>
                    </form>
                  ) : null}
                  {garmentHistory[garment.id] && (
                    <>
                      <div className="rounded-xl bg-[#fcf8f6] p-3 text-xs">
                        <h4 className="font-semibold">Price history</h4>
                        {garmentHistory[garment.id].prices.map((event) => (
                          <p className="mt-2" key={event.id}>
                            {event.previousPrice === null
                              ? "Set"
                              : `${money(event.previousPrice)} →`}{" "}
                            {money(event.newPrice)} · {event.reason} ·{" "}
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                        ))}
                        {!garmentHistory[garment.id].prices.length && (
                          <p className="mt-2 text-[#968781]">
                            No price events recorded.
                          </p>
                        )}
                      </div>
                      <div className="rounded-xl bg-[#fcf8f6] p-3 text-xs">
                        <h4 className="font-semibold">Fitting history</h4>
                        {garmentHistory[garment.id].fittings.map((fitting) => (
                          <p className="mt-2" key={fitting.id}>
                            {display(fitting.outcome)} ·{" "}
                            {new Date(fitting.completedAt).toLocaleString()}
                            {fitting.requestedAlterations
                              ? ` · Alterations: ${fitting.requestedAlterations}`
                              : ""}
                            {fitting.notes ? ` · ${fitting.notes}` : ""}
                          </p>
                        ))}
                        {!garmentHistory[garment.id].fittings.length && (
                          <p className="mt-2 text-[#968781]">
                            No fitting history recorded.
                          </p>
                        )}
                      </div>
                      <div className="rounded-xl bg-[#fcf8f6] p-3 text-xs">
                        <h4 className="font-semibold">Delivery history</h4>
                        {garmentHistory[garment.id].deliveries.map((event) => (
                          <div className="mt-2" key={event.id}>
                            <p>
                              {display(event.eventType)} ·{" "}
                              {event.occurredAt
                                ? new Date(event.occurredAt).toLocaleString()
                                : "Correction"}
                              {event.method
                                ? ` · ${display(event.method)}`
                                : ""}
                              {event.recipientName
                                ? ` · received by ${event.recipientName}`
                                : ""}
                            </p>
                            {event.correctionReason && (
                              <p className="text-[#a43c68]">
                                Correction reason: {event.correctionReason}
                              </p>
                            )}
                            {event.eventType === "delivered" &&
                              !garmentHistory[garment.id].deliveries.some(
                                (candidate) =>
                                  candidate.reversesDeliveryEventId ===
                                  event.id,
                              ) && (
                                <button
                                  className="mt-1 rounded-full border border-[#eee5e0] px-3 py-1.5"
                                  disabled={busy}
                                  onClick={() => {
                                    const reason = window.prompt(
                                      "Why must this delivery be corrected?",
                                    );
                                    if (!reason?.trim()) return;
                                    void runAction(async () => {
                                      await request(
                                        `/garments/${garment.id}/deliveries/${event.id}/reverse`,
                                        {
                                          method: "POST",
                                          body: JSON.stringify({ reason }),
                                        },
                                      );
                                      await loadMain();
                                      await loadGarmentHistory(garment);
                                    }, "Delivery correction recorded.");
                                  }}
                                  type="button"
                                >
                                  Correct this delivery
                                </button>
                              )}
                          </div>
                        ))}
                        {!garmentHistory[garment.id].deliveries.length && (
                          <p className="mt-2 text-[#968781]">
                            No delivery history recorded.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  {garment.stage === "cancelled" && (
                    <>
                      {garmentHistory[garment.id]?.settlement ? (
                        <div className="rounded-xl bg-[#fcf8f6] p-3 text-xs">
                          <h4 className="font-semibold">
                            Cancellation settlement
                          </h4>
                          <p className="mt-2">
                            Refund agreed:{" "}
                            {money(
                              garmentHistory[garment.id].settlement
                                ?.amountToRefund,
                            )}{" "}
                            · Retained:{" "}
                            {money(
                              garmentHistory[garment.id].settlement
                                ?.amountRetained,
                            )}{" "}
                            · Outstanding:{" "}
                            {money(
                              garmentHistory[garment.id].settlement
                                ?.refundOutstanding,
                            )}
                          </p>
                          <p className="mt-1">
                            {garmentHistory[garment.id].settlement?.reason} ·{" "}
                            {
                              garmentHistory[garment.id].settlement
                                ?.customerAgreement
                            }
                          </p>
                          {garmentHistory[garment.id].settlement?.refunds.map(
                            (refund) => (
                              <p className="mt-2" key={refund.id}>
                                Refunded {money(refund.amount)} by{" "}
                                {display(refund.method)} ·{" "}
                                {new Date(
                                  refund.refundedAt,
                                ).toLocaleDateString()}
                                {refund.reference
                                  ? ` · ${refund.reference}`
                                  : ""}
                                {refund.note ? ` · ${refund.note}` : ""}
                              </p>
                            ),
                          )}
                        </div>
                      ) : (
                        <form
                          className="grid gap-2 sm:grid-cols-2"
                          onSubmit={(event) =>
                            submit(
                              event,
                              async (form) => {
                                const settlement =
                                  await request<CancellationSettlement>(
                                    `/garments/${garment.id}/cancellation-settlement`,
                                    {
                                      method: "POST",
                                      body: JSON.stringify({
                                        amountToRefund: String(
                                          form.get("amountToRefund"),
                                        ),
                                        amountRetained: String(
                                          form.get("amountRetained"),
                                        ),
                                        reason: String(form.get("reason")),
                                        customerAgreement: String(
                                          form.get("customerAgreement"),
                                        ),
                                      }),
                                    },
                                  );
                                setGarmentHistory((current) => ({
                                  ...current,
                                  [garment.id]: {
                                    fittings:
                                      current[garment.id]?.fittings ?? [],
                                    deliveries:
                                      current[garment.id]?.deliveries ?? [],
                                    prices: current[garment.id]?.prices ?? [],
                                    settlement,
                                  },
                                }));
                              },
                              "Cancellation settlement recorded.",
                            )
                          }
                        >
                          {field("Agreed refund (NGN)", "amountToRefund", {
                            type: "number",
                            min: "0",
                            step: "0.01",
                            required: true,
                          })}
                          {field("Amount retained (NGN)", "amountRetained", {
                            type: "number",
                            min: "0",
                            step: "0.01",
                            required: true,
                          })}
                          {field("Reason", "reason", {
                            required: true,
                            maxLength: 1000,
                          })}
                          {field("Customer agreement", "customerAgreement", {
                            required: true,
                            maxLength: 5000,
                          })}
                          <button
                            className={`${buttonClass} sm:col-span-2`}
                            disabled={busy}
                          >
                            Record settlement
                          </button>
                        </form>
                      )}
                      {garmentHistory[garment.id]?.settlement &&
                        Number(
                          garmentHistory[garment.id].settlement
                            ?.refundOutstanding,
                        ) > 0 && (
                          <form
                            className="grid gap-2 sm:grid-cols-2"
                            onSubmit={(event) =>
                              submit(
                                event,
                                async (form) => {
                                  const settlement =
                                    garmentHistory[garment.id].settlement;
                                  if (!settlement)
                                    throw new Error(
                                      "Load or create the settlement before recording a refund.",
                                    );
                                  await request(
                                    `/garments/${garment.id}/cancellation-settlement/${settlement.id}/refunds`,
                                    {
                                      method: "POST",
                                      body: JSON.stringify({
                                        amount: String(form.get("amount")),
                                        method: String(form.get("method")),
                                        reference:
                                          String(form.get("reference") || "") ||
                                          undefined,
                                        note:
                                          String(form.get("note") || "") ||
                                          undefined,
                                      }),
                                    },
                                  );
                                  await loadGarmentHistory(garment);
                                },
                                "Cancellation refund recorded.",
                              )
                            }
                          >
                            {field("Refund paid now (NGN)", "amount", {
                              type: "number",
                              min: "0.01",
                              step: "0.01",
                              required: true,
                            })}
                            {selectField(
                              "Refund method",
                              "method",
                              [
                                "cash",
                                "bank_transfer",
                                "card",
                                "mobile_money",
                                "other",
                              ].map((value) => ({
                                value,
                                label: display(value),
                              })),
                            )}
                            {field("Reference", "reference", {
                              maxLength: 200,
                            })}
                            {field("Note", "note", { maxLength: 5000 })}
                            <button
                              className={`${buttonClass} sm:col-span-2`}
                              disabled={busy}
                            >
                              Record refund
                            </button>
                          </form>
                        )}
                    </>
                  )}
                </div>
              </details>
            </article>
          ))}
        </div>
      </>
    );
  }

  function renderItems() {
    return (
      <>
        <form
          className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) =>
            submit(
              event,
              async (form) => {
                await request("/purchase-items", {
                  method: "POST",
                  body: JSON.stringify({
                    name: String(form.get("name")),
                    category: String(form.get("category")),
                    quantity: String(form.get("quantity")),
                    unit: String(form.get("unit")),
                    unitPrice: String(form.get("unitPrice")),
                    supplier: String(form.get("supplier") || ""),
                    orderId: String(form.get("orderId") || "") || undefined,
                  }),
                });
              },
              "Item added to the purchase list.",
            )
          }
        >
          {field("Item", "name", { required: true, maxLength: 200 })}
          {field("Category", "category", { required: true, maxLength: 80 })}
          {field("Quantity", "quantity", {
            type: "number",
            min: "0.01",
            step: "0.01",
            required: true,
          })}
          {field("Unit", "unit", { required: true, maxLength: 40 })}
          {field("Unit price (NGN)", "unitPrice", {
            type: "number",
            min: "0",
            step: "0.01",
            required: true,
          })}
          {field("Supplier", "supplier", { maxLength: 200 })}
          {selectField(
            "Order (optional)",
            "orderId",
            orders.map(({ id, reference }) => ({
              value: id,
              label: reference,
            })),
            false,
          )}
          <button
            className={`${buttonClass} sm:col-span-2 lg:col-span-4`}
            disabled={busy}
          >
            Add item
          </button>
        </form>
        <div className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white">
          {items.map((item) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f2ece8] p-4 last:border-b-0"
              key={item.id}
            >
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="mt-1 text-xs text-[#968781]">
                  {item.category} · {item.quantity} {item.unit} ·{" "}
                  {money(item.unitPrice)} each ·{" "}
                  {item.supplier || "Supplier not set"}
                  {item.orderReference ? ` · ${item.orderReference}` : ""}
                </p>
              </div>
              <select
                aria-label={`Status for ${item.name}`}
                className={`${fieldClass} mt-0 w-44`}
                disabled={busy}
                onChange={(event) =>
                  void runAction(async () => {
                    await request(`/purchase-items/${item.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: event.target.value }),
                    });
                    await loadMain();
                  }, "Purchase item status updated.")
                }
                value={item.status}
              >
                <option value="to_buy">To buy</option>
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
              </select>
            </article>
          ))}
          {!items.length && (
            <p className="p-6 text-sm text-[#968781]">No purchase items yet.</p>
          )}
        </div>
      </>
    );
  }

  function renderAppointments() {
    return (
      <>
        <form
          className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) =>
            submit(
              event,
              async (form) => {
                await request("/appointments", {
                  method: "POST",
                  body: JSON.stringify({
                    customerId: String(form.get("customerId")),
                    orderId: String(form.get("orderId") || "") || undefined,
                    garmentId: String(form.get("garmentId") || "") || undefined,
                    type: String(form.get("type")),
                    scheduledAt: new Date(
                      String(form.get("scheduledAt")),
                    ).toISOString(),
                    notes: String(form.get("notes") || ""),
                  }),
                });
              },
              "Appointment scheduled.",
            )
          }
        >
          {selectField(
            "Customer",
            "customerId",
            customers.map(({ id, name }) => ({ value: id, label: name })),
          )}
          {selectField(
            "Order (optional)",
            "orderId",
            orders.map(({ id, reference }) => ({
              value: id,
              label: reference,
            })),
            false,
          )}
          {selectField(
            "Garment (optional)",
            "garmentId",
            orders.flatMap((order) =>
              order.garments.map((garment) => ({
                value: garment.id,
                label: `${order.reference} · ${garment.description}`,
              })),
            ),
            false,
          )}
          {selectField(
            "Type",
            "type",
            [
              "consultation",
              "first_fitting",
              "progress_fitting",
              "final_fitting",
              "pickup",
            ].map((value) => ({ value, label: display(value) })),
          )}
          {field("Date & time", "scheduledAt", {
            type: "datetime-local",
            required: true,
          })}
          {field("Notes", "notes", { maxLength: 5000 })}
          <button
            className={`${buttonClass} sm:col-span-2 lg:col-span-4`}
            disabled={busy || !customers.length}
          >
            Schedule appointment
          </button>
        </form>
        <div className="space-y-2">
          {appointments.map((appointment) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eee5e0] bg-white p-4"
              key={appointment.id}
            >
              <div>
                <h3 className="font-semibold">
                  {appointment.customerName} · {display(appointment.type)}
                </h3>
                <p className="mt-1 text-xs text-[#968781]">
                  {new Date(appointment.scheduledAt).toLocaleString()} ·{" "}
                  {appointment.orderReference || "No order linked"} ·{" "}
                  {appointment.notes || "No notes"}
                </p>
              </div>
              <select
                aria-label={`Appointment status for ${appointment.customerName}`}
                className={`${fieldClass} mt-0 w-48`}
                disabled={busy}
                onChange={(event) =>
                  void runAction(async () => {
                    await request(`/appointments/${appointment.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: event.target.value }),
                    });
                    await loadMain();
                  }, "Appointment updated.")
                }
                value={appointment.status}
              >
                {[
                  "needs_confirmation",
                  "confirmed",
                  "completed",
                  "cancelled",
                ].map((status) => (
                  <option key={status} value={status}>
                    {display(status)}
                  </option>
                ))}
              </select>
            </article>
          ))}
          {!appointments.length && (
            <p className="rounded-2xl border border-[#eee5e0] bg-white p-6 text-sm text-[#968781]">
              No appointments scheduled.
            </p>
          )}
        </div>
      </>
    );
  }

  function renderMeasurements() {
    const fields = [
      ["Bust", "bust"],
      ["Waist", "waist"],
      ["Hips", "hips"],
      ["Shoulder width", "shoulderWidth"],
      ["Shoulder to waist", "shoulderToWaist"],
      ["Sleeve length", "sleeveLength"],
      ["Armhole", "armhole"],
      ["Desired dress length", "desiredDressLength"],
    ];
    return (
      <>
        <label className={labelClass}>
          Customer
          <select
            className={fieldClass}
            onChange={(event) => setSelectedCustomerId(event.target.value)}
            value={selectedCustomerId}
          >
            {customers.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <form
          className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) =>
            submit(
              event,
              async (form) => {
                const unit = String(form.get("unit"));
                const measurements = Object.fromEntries(
                  fields
                    .map(([, key]) => [key, String(form.get(key) || "")])
                    .filter(([, value]) => value),
                );
                await request(`/customers/${selectedCustomerId}/measurements`, {
                  method: "POST",
                  body: JSON.stringify({
                    measuredAt: new Date().toISOString(),
                    unit,
                    ...measurements,
                  }),
                });
              },
              "Measurement set saved.",
            )
          }
        >
          {selectField("Unit", "unit", [
            { value: "cm", label: "Centimetres (cm)" },
            { value: "in", label: "Inches (in)" },
          ])}
          {fields.map(([label, key]) =>
            field(`${label} (optional)`, key, {
              type: "number",
              min: "0.01",
              step: "0.01",
            }),
          )}
          {field("Notes", "notes", { maxLength: 5000 })}
          <button
            className={`${buttonClass} sm:col-span-2 lg:col-span-4`}
            disabled={busy || !selectedCustomerId}
          >
            Save measurements
          </button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {measurements.map((measurement) => (
            <article
              className="rounded-2xl border border-[#eee5e0] bg-white p-4"
              key={measurement.id}
            >
              <h3 className="font-semibold">
                {selectedCustomer?.name ?? "Customer"}
              </h3>
              <p className="mt-1 text-xs text-[#968781]">
                {new Date(measurement.measuredAt).toLocaleDateString()} ·{" "}
                {measurement.unit}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {fields.map(([label, key]) => {
                  const value = measurement[key as keyof Measurement];
                  return typeof value === "string" && value ? (
                    <div className="flex justify-between gap-2" key={key}>
                      <dt className="text-[#968781]">{label}</dt>
                      <dd>
                        {value} {measurement.unit}
                      </dd>
                    </div>
                  ) : null;
                })}
              </dl>
              {measurement.notes && (
                <p className="mt-3 text-xs text-[#756a68]">
                  {measurement.notes}
                </p>
              )}
            </article>
          ))}
          {!measurements.length && (
            <p className="text-sm text-[#968781]">
              No measurement sets recorded for this customer.
            </p>
          )}
        </div>
      </>
    );
  }

  function renderPayments() {
    const garments = selectedOrder?.garments ?? [];
    return (
      <>
        <label className={labelClass}>
          Order
          <select
            className={fieldClass}
            onChange={(event) => setSelectedOrderId(event.target.value)}
            value={selectedOrderId}
          >
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.reference} · {order.customerName}
              </option>
            ))}
          </select>
        </label>
        <form
          className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) =>
            submit(
              event,
              async (form) => {
                const garmentId = String(form.get("garmentId") || "");
                const amount = String(form.get("amount"));
                await request(`/orders/${selectedOrderId}/payments`, {
                  method: "POST",
                  body: JSON.stringify({
                    amount,
                    method: String(form.get("method")),
                    reference: String(form.get("reference") || ""),
                    note: String(form.get("note") || ""),
                    allocations: garmentId
                      ? [
                          {
                            garmentId,
                            amount: String(
                              form.get("allocationAmount") || amount,
                            ),
                          },
                        ]
                      : [],
                  }),
                });
              },
              "Payment recorded.",
            )
          }
        >
          {field("Amount received (NGN)", "amount", {
            type: "number",
            min: "0.01",
            step: "0.01",
            required: true,
          })}
          {selectField(
            "Payment method",
            "method",
            ["cash", "bank_transfer", "card", "mobile_money", "other"].map(
              (value) => ({ value, label: display(value) }),
            ),
          )}
          {field("Reference", "reference", { maxLength: 200 })}
          {field("Note", "note", { maxLength: 5000 })}
          {selectField(
            "Allocate to garment (optional)",
            "garmentId",
            garments.map(({ id, description }) => ({
              value: id,
              label: description,
            })),
            false,
          )}
          {field("Allocation amount (optional)", "allocationAmount", {
            type: "number",
            min: "0.01",
            step: "0.01",
          })}
          <button
            className={`${buttonClass} sm:col-span-2 lg:col-span-4`}
            disabled={busy || !selectedOrderId}
          >
            Record payment
          </button>
        </form>
        <div className="space-y-2">
          {payments.map((payment) => (
            <article
              className="rounded-2xl border border-[#eee5e0] bg-white p-4"
              key={payment.id}
            >
              <div className="flex justify-between gap-3">
                <strong>
                  {money(payment.amount)} · {display(payment.method)}
                </strong>
                <span className="text-xs capitalize">{payment.status}</span>
              </div>
              <p className="mt-1 text-xs text-[#968781]">
                {new Date(payment.receivedAt).toLocaleString()} · Allocated{" "}
                {money(payment.allocatedAmount)} · Unallocated{" "}
                {money(payment.unallocatedAmount)}
                {payment.reference ? ` · ${payment.reference}` : ""}
              </p>
              {payment.void?.reason && (
                <p className="mt-2 text-xs text-[#a43c68]">
                  Void reason: {payment.void.reason}
                </p>
              )}
              {payment.allocations.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-[#f1e9e4] pt-3">
                  <h3 className="text-xs font-semibold">Garment allocations</h3>
                  {payment.allocations.map((allocation) => {
                    const garment = garments.find(
                      (item) => item.id === allocation.garmentId,
                    );
                    return (
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 text-xs"
                        key={allocation.id}
                      >
                        <span>
                          {garment?.description ?? "Garment"} ·{" "}
                          {money(allocation.amount)} ·{" "}
                          {allocation.active ? "active" : "reversed"}
                          {allocation.reversal
                            ? ` · ${allocation.reversal.reason}`
                            : ""}
                        </span>
                        {allocation.active && payment.status === "active" && (
                          <button
                            className="rounded-full border border-[#eee5e0] px-3 py-1.5 text-[#a43c68]"
                            disabled={busy}
                            onClick={() => {
                              const reason = window.prompt(
                                "Why should this allocation be reversed?",
                              );
                              if (!reason?.trim()) return;
                              void runAction(async () => {
                                await request(
                                  `/orders/${selectedOrderId}/payments/${payment.id}/allocations/${allocation.id}/reverse`,
                                  {
                                    method: "POST",
                                    body: JSON.stringify({ reason }),
                                  },
                                );
                                await loadMain();
                                await loadPayments();
                              }, "Payment allocation reversal recorded.");
                            }}
                            type="button"
                          >
                            Reverse allocation
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {payment.status === "active" &&
                Number(payment.unallocatedAmount) > 0 && (
                  <form
                    className="mt-3 grid gap-2 border-t border-[#f1e9e4] pt-3 sm:grid-cols-3"
                    onSubmit={(event) =>
                      submit(
                        event,
                        async (form) => {
                          await request(
                            `/orders/${selectedOrderId}/payments/${payment.id}/allocations`,
                            {
                              method: "POST",
                              body: JSON.stringify({
                                allocations: [
                                  {
                                    garmentId: String(form.get("garmentId")),
                                    amount: String(form.get("amount")),
                                  },
                                ],
                              }),
                            },
                          );
                        },
                        "Payment allocated to the selected garment.",
                      )
                    }
                  >
                    {selectField(
                      "Allocate remaining payment to",
                      "garmentId",
                      garments
                        .filter((garment) => garment.stage !== "cancelled")
                        .map(({ id, description }) => ({
                          value: id,
                          label: description,
                        })),
                    )}
                    {field(
                      `Amount (up to ${money(payment.unallocatedAmount)})`,
                      "amount",
                      {
                        type: "number",
                        min: "0.01",
                        step: "0.01",
                        required: true,
                      },
                    )}
                    <button
                      className={buttonClass}
                      disabled={
                        busy ||
                        !garments.some(
                          (garment) => garment.stage !== "cancelled",
                        )
                      }
                    >
                      Allocate payment
                    </button>
                  </form>
                )}
              {payment.status === "active" &&
                payment.allocations.every(
                  (allocation) => !allocation.active,
                ) && (
                  <button
                    className="mt-3 rounded-full border border-[#e6c6d0] px-3 py-2 text-xs text-[#a43c68]"
                    disabled={busy}
                    onClick={() => {
                      const reason = window.prompt(
                        "Why is this payment being voided?",
                      );
                      if (!reason?.trim()) return;
                      void runAction(async () => {
                        await request(
                          `/orders/${selectedOrderId}/payments/${payment.id}/void`,
                          {
                            method: "POST",
                            body: JSON.stringify({ reason }),
                          },
                        );
                        await loadMain();
                        await loadPayments();
                      }, "Payment void recorded.");
                    }}
                    type="button"
                  >
                    Void payment
                  </button>
                )}
            </article>
          ))}
          {!payments.length && (
            <p className="text-sm text-[#968781]">
              No payments recorded for this order.
            </p>
          )}
        </div>
      </>
    );
  }

  async function uploadStory(form: FormData) {
    const orderId = String(form.get("orderId"));
    const garmentId = String(form.get("garmentId"));
    const video = form.get("video");
    if (!(video instanceof File) || video.size === 0) {
      throw new Error("Choose an MP4 or MOV video.");
    }
    const upload = await request<{
      media: { id: string };
      uploadUrl: string;
      requiredHeaders: Record<string, string>;
    }>(`/garments/${garmentId}/media/upload-url`, {
      method: "POST",
      body: JSON.stringify({
        filename: video.name,
        contentType: video.type,
        fileSizeBytes: video.size,
      }),
    });
    const response = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: upload.requiredHeaders,
      body: video,
    });
    if (!response.ok)
      throw new Error(`Video upload failed (${response.status}).`);
    await request(`/media/${upload.media.id}/complete`, { method: "POST" });
    await request("/client-stories", {
      method: "POST",
      body: JSON.stringify({
        orderId,
        garmentId,
        mediaId: upload.media.id,
        rating: Number(form.get("rating")),
        feedback: String(form.get("feedback")),
      }),
    });
  }

  function renderStories() {
    return (
      <>
        <form
          className="grid gap-3 rounded-2xl border border-[#f0e2e5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
          encType="multipart/form-data"
          onSubmit={(event) =>
            submit(
              event,
              uploadStory,
              "Private client story saved with its garment video.",
            )
          }
        >
          {selectField(
            "Order",
            "orderId",
            orders.map(({ id, reference }) => ({
              value: id,
              label: reference,
            })),
          )}
          {selectField(
            "Garment",
            "garmentId",
            orders.flatMap((order) =>
              order.garments.map((garment) => ({
                value: garment.id,
                label: `${order.reference} · ${garment.description}`,
              })),
            ),
          )}
          {selectField(
            "Rating",
            "rating",
            [1, 2, 3, 4, 5].map((value) => ({
              value: String(value),
              label: `${value} / 5`,
            })),
          )}
          {field("Customer video", "video", { type: "file", required: true })}
          {field("Satisfaction feedback", "feedback", {
            required: true,
            maxLength: 5000,
          })}
          <p className="self-center text-xs text-[#837773]">
            MP4/MOV · up to 200 MB · private by default
          </p>
          <button
            className={`${buttonClass} sm:col-span-2 lg:col-span-4`}
            disabled={busy || !orders.length}
          >
            Upload & save story
          </button>
        </form>
        <div className="grid gap-3 md:grid-cols-2">
          {stories.map((story) => {
            const latestConsent = [...(story.consent ?? [])].sort(
              (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
            )[0];
            const shared = latestConsent?.action === "granted";
            return (
              <article
                className="overflow-hidden rounded-2xl border border-[#eee5e0] bg-white"
                key={story.id}
              >
                {story.videoUrl && (
                  <video
                    className="aspect-video w-full bg-black object-contain"
                    controls
                    preload="metadata"
                    src={story.videoUrl}
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold">
                    {story.customerName} · {story.orderReference}
                  </h3>
                  <p className="mt-1 text-xs text-[#968781]">
                    {story.garmentName} · {story.rating}/5 ·{" "}
                    {new Date(story.createdAt).toLocaleDateString()}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#756a68]">
                    {story.feedback}
                  </p>
                  <p
                    className={`mt-3 rounded-lg px-3 py-2 text-xs ${shared ? "bg-[#edf4ef] text-[#52715d]" : "bg-[#fff8e9] text-[#786444]"}`}
                  >
                    {shared
                      ? `Portfolio consent: ${latestConsent?.method}`
                      : "Private · no active portfolio consent"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!shared && (
                      <button
                        className="rounded-full border border-[#eee5e0] px-3 py-1.5 text-xs"
                        disabled={busy}
                        onClick={() => {
                          const method = window.prompt(
                            "Consent method: written, electronic, or verbal",
                          );
                          if (
                            !method ||
                            !["written", "electronic", "verbal"].includes(
                              method,
                            )
                          )
                            return;
                          void runAction(async () => {
                            await request(
                              `/media/${story.mediaId}/portfolio-consent`,
                              {
                                method: "POST",
                                body: JSON.stringify({
                                  consentedAt: new Date().toISOString(),
                                  method,
                                }),
                              },
                            );
                            await loadMain();
                          }, "Portfolio consent recorded for this video.");
                        }}
                        type="button"
                      >
                        Record sharing consent
                      </button>
                    )}
                    {shared && (
                      <button
                        className="rounded-full border border-[#eee5e0] px-3 py-1.5 text-xs"
                        disabled={busy}
                        onClick={() => {
                          const note =
                            window.prompt(
                              "Optional note for consent withdrawal",
                            ) ?? "";
                          void runAction(async () => {
                            await request(
                              `/media/${story.mediaId}/portfolio-consent/withdraw`,
                              {
                                method: "POST",
                                body: JSON.stringify({
                                  withdrawnAt: new Date().toISOString(),
                                  note,
                                }),
                              },
                            );
                            await loadMain();
                          }, "Portfolio consent withdrawal recorded.");
                        }}
                        type="button"
                      >
                        Withdraw consent
                      </button>
                    )}
                    <button
                      className="rounded-full border border-[#eee5e0] px-3 py-1.5 text-xs"
                      disabled={busy}
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Delete this private video? Its story record will remain.",
                          )
                        )
                          return;
                        void runAction(async () => {
                          await request(`/media/${story.mediaId}`, {
                            method: "DELETE",
                          });
                          await loadMain();
                        }, "Private video deleted.");
                      }}
                      type="button"
                    >
                      Delete video
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {!stories.length && (
            <p className="text-sm text-[#968781]">
              No client stories saved yet.
            </p>
          )}
        </div>
      </>
    );
  }

  const titles: Record<Screen, string> = {
    orders: "Orders",
    garments: "Garments",
    items: "Items to purchase",
    stories: "Client stories",
    customers: "Customers",
    appointments: "Appointments & fittings",
    measurements: "Measurement book",
    payments: "Payments",
  };

  function renderScreen() {
    switch (screen) {
      case "orders":
        return renderOrders();
      case "garments":
        return renderGarments();
      case "items":
        return renderItems();
      case "stories":
        return renderStories();
      case "customers":
        return renderCustomers();
      case "appointments":
        return renderAppointments();
      case "measurements":
        return renderMeasurements();
      case "payments":
        return renderPayments();
    }
  }

  return (
    <div className="min-h-[calc(100vh-90px)] bg-[#faf7f3] text-[#342a2c]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-9 xl:px-10">
        <header className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ad6d7f]">
              Secure workroom · Signed in as {displayName}
            </p>
            <h1 className="mt-2 font-serif text-3xl text-[#3d2c32] sm:text-4xl">
              {titles[screen]}
            </h1>
            <p className="mt-2 text-sm text-[#837773]">
              Live business records. Protected by your verified MFA session.
            </p>
          </div>
          <button
            className="rounded-full border border-[#ead1da] bg-white px-4 py-2 text-xs font-semibold text-[#a33c68]"
            disabled={busy || loading}
            onClick={() => void loadMain()}
            type="button"
          >
            Refresh data
          </button>
        </header>

        <nav
          aria-label="Workroom"
          className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8"
        >
          {screens.map(({ id, label, icon: Icon }) => (
            <button
              aria-current={screen === id ? "page" : undefined}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium ${screen === id ? "border-[#ead1da] bg-[#f9eef3] text-[#a33c68]" : "border-[#eee5e0] bg-white text-[#756a68]"}`}
              key={id}
              onClick={() => {
                setScreen(id);
                setError("");
                setNotice("");
              }}
              type="button"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {renderGuidance()}
        {resourceErrors.length > 0 && (
          <div
            className="mt-4 rounded-xl border border-[#f0c7d7] bg-[#fff2f6] p-4 text-sm text-[#9b315a]"
            role="alert"
          >
            <p className="font-semibold">Some records could not be loaded.</p>
            <ul className="mt-1 list-inside list-disc">
              {resourceErrors.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              If a new workroom area is unavailable, its database migration may
              not yet be applied.
            </p>
          </div>
        )}
        {error && (
          <p
            className="mt-4 rounded-xl border border-[#f0c7d7] bg-[#fff2f6] p-4 text-sm text-[#9b315a]"
            role="alert"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            className="mt-4 rounded-xl border border-[#ead6b2] bg-[#fff9ed] p-4 text-sm text-[#7b6342]"
            role="status"
          >
            {notice}
          </p>
        )}
        {loading ? (
          <div
            className="mt-5 rounded-2xl border border-[#eee5e0] bg-white p-8 text-sm text-[#837773]"
            role="status"
          >
            Loading your business records…
          </div>
        ) : (
          <section className="mt-5 space-y-4">{renderScreen()}</section>
        )}
        <p className="mt-8 border-t border-[#eee5e0] pt-5 text-xs text-[#a0938c]">
          Only live API records appear in the workroom. The example cards above
          are not saved.
        </p>
        {activeOrders.length > 0 && (
          <span className="sr-only">{activeOrders.length} active orders</span>
        )}
      </div>
    </div>
  );
}
