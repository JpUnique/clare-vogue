export type OrderStatus =
  | "In progress"
  | "Needs attention"
  | "Ready for fitting"
  | "Complete";

export type Garment = {
  id: string;
  name: string;
  category: string;
  stage: string;
  progress: number;
  color: string;
};

export type Order = {
  id: string;
  reference: string;
  client: string;
  title: string;
  dueDate: string;
  status: OrderStatus;
  garments: Garment[];
};

export type OrderOption = {
  reference: string;
  client: string;
  garments: { id?: string; name: string }[];
};

export const initialOrders: Order[] = [
  {
    id: "order-2048",
    reference: "CV-2048",
    client: "Amara Okafor",
    title: "The Aso-Oke Edit",
    dueDate: "Nov 14",
    status: "In progress",
    garments: [
      { id: "g-2048-1", name: "Ceremony two-piece", category: "Aso-oke set", stage: "Hand finishing", progress: 82, color: "#b54773" },
      { id: "g-2048-2", name: "Reception dress", category: "Eveningwear", stage: "Final fitting", progress: 64, color: "#bd9b62" },
      { id: "g-2048-3", name: "Silk head tie", category: "Accessory", stage: "Ready for pickup", progress: 100, color: "#64746a" },
    ],
  },
  {
    id: "order-2047",
    reference: "CV-2047",
    client: "Nneka Williams",
    title: "A Modern Heirloom",
    dueDate: "Nov 18",
    status: "Needs attention",
    garments: [
      { id: "g-2047-1", name: "Bespoke occasion gown", category: "Occasionwear", stage: "Awaiting client fitting", progress: 52, color: "#7770a1" },
      { id: "g-2047-2", name: "Structured jacket", category: "Tailoring", stage: "Pattern cutting", progress: 28, color: "#596d7b" },
    ],
  },
  {
    id: "order-2046",
    reference: "CV-2046",
    client: "Zara Adeyemi",
    title: "Soft Gold Occasionwear",
    dueDate: "Nov 21",
    status: "Ready for fitting",
    garments: [
      { id: "g-2046-1", name: "Draped satin dress", category: "Eveningwear", stage: "Fitting booked · Nov 8", progress: 91, color: "#b99b5b" },
      { id: "g-2046-2", name: "Beaded clutch", category: "Accessory", stage: "Hand finishing", progress: 76, color: "#95756d" },
    ],
  },
  {
    id: "order-2045",
    reference: "CV-2045",
    client: "Maya Thompson",
    title: "Everyday, Elevated",
    dueDate: "Nov 28",
    status: "In progress",
    garments: [
      { id: "g-2045-1", name: "Linen co-ord", category: "Daywear", stage: "Sewing", progress: 43, color: "#9b806e" },
    ],
  },
  {
    id: "order-2044",
    reference: "CV-2044",
    client: "Tomi Adebayo",
    title: "The Celebration Set",
    dueDate: "Oct 30",
    status: "Complete",
    garments: [
      { id: "g-2044-1", name: "Embellished skirt set", category: "Occasionwear", stage: "Collected", progress: 100, color: "#b5637c" },
      { id: "g-2044-2", name: "Silk blouse", category: "Daywear", stage: "Collected", progress: 100, color: "#818771" },
    ],
  },
];

export const statusStyles: Record<OrderStatus, string> = {
  "In progress": "bg-[#f8edf2] text-[#9c3d66]",
  "Needs attention": "bg-[#fff2e4] text-[#9a6223]",
  "Ready for fitting": "bg-[#edf4ef] text-[#52715d]",
  Complete: "bg-[#f0efeb] text-[#716a5b]",
};

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const previewInputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[#eee5e0] bg-white px-3 text-sm font-normal text-[#493b3e] outline-none transition placeholder:text-[#b4a7a0] focus:border-[#c98ba0] focus:ring-2 focus:ring-[#a43c68]/10";
