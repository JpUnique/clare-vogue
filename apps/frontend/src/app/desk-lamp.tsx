"use client";

import { motion } from "framer-motion";
import { useState } from "react";

type DeskLampProps = {
  isOn: boolean;
  accent: string;
  onToggle: () => void;
};

export default function DeskLamp({
  isOn,
  accent,
  onToggle,
}: DeskLampProps) {
  const [pulling, setPulling] = useState(false);

  function pullCord() {
    if (pulling) return;
    setPulling(true);
    onToggle();
    window.setTimeout(() => setPulling(false), 520);
  }

  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-18%] bottom-[10%] h-[55%] rounded-full blur-[70px]"
        animate={{
          opacity: isOn ? 0.62 : 0,
          background: `radial-gradient(ellipse at 50% 20%, ${accent}55, transparent 70%)`,
        }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      <svg
        aria-label={`Vintage articulated desk lamp, currently ${isOn ? "on" : "off"}`}
        className="relative z-10 h-auto w-full overflow-visible"
        role="img"
        style={{
          opacity: isOn ? 0.22 : 1,
          transition: "opacity 650ms ease",
        }}
        viewBox="0 0 500 540"
      >
        <defs>
          <linearGradient id="lamp-brass" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#f4d58b" />
            <stop offset=".45" stopColor="#a97832" />
            <stop offset=".72" stopColor="#e9c678" />
            <stop offset="1" stopColor="#795326" />
          </linearGradient>
          <linearGradient id="lamp-arm" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#381229" />
            <stop offset=".42" stopColor="#8e2858" />
            <stop offset=".7" stopColor="#4d1636" />
            <stop offset="1" stopColor="#24101d" />
          </linearGradient>
          <linearGradient id="lamp-shade" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#f4a8cc" />
            <stop offset=".28" stopColor="#d9438b" />
            <stop offset=".68" stopColor="#9b1d5b" />
            <stop offset="1" stopColor="#541137" />
          </linearGradient>
          <radialGradient id="lamp-bulb">
            <stop offset="0" stopColor={accent} stopOpacity={isOn ? ".95" : "0"} />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        <motion.ellipse
          cx="252"
          cy="350"
          rx="165"
          ry="122"
          fill={accent}
          initial={false}
          animate={{ opacity: isOn ? 0.16 : 0 }}
          transition={{ duration: 0.8 }}
        />

        <ellipse cx="250" cy="500" rx="157" ry="17" fill="#000" opacity=".5" />
        <ellipse
          cx="250"
          cy="484"
          rx="137"
          ry="18"
          fill="#101217"
          stroke="#9b1d5b"
          strokeWidth="4"
        />
        <ellipse
          cx="250"
          cy="479"
          rx="119"
          ry="11"
          fill="#24101d"
          stroke="#d51d78"
          strokeOpacity=".78"
          strokeWidth="3"
        />
        <ellipse cx="250" cy="477" rx="93" ry="6" fill="#41152e" />

        <path
          d="M250 475 195 257"
          fill="none"
          stroke="#24101d"
          strokeLinecap="round"
          strokeWidth="22"
        />
        <path
          d="M250 470 198 258"
          fill="none"
          stroke="url(#lamp-arm)"
          strokeLinecap="round"
          strokeWidth="13"
        />
        <path
          d="M251 453 205 268"
          fill="none"
          stroke="#e78ab7"
          strokeLinecap="round"
          strokeOpacity=".36"
          strokeWidth="2"
        />

        <path
          d="M198 256 282 132"
          fill="none"
          stroke="#24101d"
          strokeLinecap="round"
          strokeWidth="8"
        />
        <path
          d="M198 256 282 132"
          fill="none"
          stroke="#b94b7d"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <circle cx="198" cy="256" r="18" fill="url(#lamp-brass)" />
        <circle cx="198" cy="256" r="10" fill="#41152e" />
        <circle cx="198" cy="256" r="4" fill="#c59a4a" />
        <circle cx="250" cy="474" r="21" fill="url(#lamp-brass)" />
        <circle cx="250" cy="474" r="12" fill="#41152e" />
        <circle cx="250" cy="474" r="5" fill="#d4b264" />

        <g transform="rotate(13 315 112)">
          <path
            d="M221 119c4-35 22-77 52-96 30-19 68-15 93 9 23 22 39 61 48 94-55 27-133 24-193-7Z"
            fill="url(#lamp-shade)"
            stroke="#541137"
            strokeWidth="5"
          />
          <path
            d="M221 119c50-25 135-13 193 7 11 4 14 12 4 18-51 26-139 12-198-7-10-4-10-13 1-18Z"
            fill="#701744"
            stroke="url(#lamp-brass)"
            strokeWidth="5"
          />
          <path
            d="M231 120c51-20 126-10 177 7"
            fill="none"
            stroke="#f1aacb"
            strokeOpacity=".65"
            strokeWidth="2"
          />
          <motion.ellipse
            cx="321"
            cy="133"
            rx="25"
            ry="10"
            fill="url(#lamp-bulb)"
            initial={false}
            animate={{ opacity: isOn ? 1 : 0 }}
            transition={{ duration: 0.45 }}
          />
          <path
            d="M312 132c3-10 16-10 19 0l-2 9h-15z"
            fill={isOn ? accent : "#b28a43"}
            opacity={isOn ? ".95" : ".55"}
          />
          <path
            d="M316 131q5-9 10 0"
            fill="none"
            stroke="#fff1d2"
            strokeOpacity=".75"
            strokeWidth="1.5"
          />
        </g>

        <motion.g
          initial={false}
          animate={pulling ? { y: [0, 25, -3, 0] } : { y: 0 }}
          transition={
            pulling
              ? { duration: 0.52, times: [0, 0.32, 0.68, 1], ease: "easeOut" }
              : { type: "spring", stiffness: 360, damping: 24 }
          }
        >
          <path
            d="M326 150c12 50 31 130 52 222"
            fill="none"
            stroke="url(#lamp-brass)"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <path
            d="M374 369c-3-7-1-12 5-12s8 5 5 12l-2 8h-7z"
            fill="url(#lamp-brass)"
          />
          <ellipse cx="379" cy="378" rx="5" ry="3" fill="#f3d48a" />
        </motion.g>
      </svg>

      <div className="absolute left-[73%] top-[51%] z-20">
        <motion.span
          aria-hidden="true"
          className="block rounded-md border border-[#d51d78]/35 bg-[#24101d]/95 px-3 py-2 text-xs font-medium text-white/85 shadow-lg backdrop-blur"
          initial={false}
          animate={{ opacity: isOn ? 0 : 1, x: isOn ? -4 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <span className="mr-1.5 text-[#e9c678]">↓</span>
          Pull to turn on
        </motion.span>
      </div>
      <motion.button
        aria-label={isOn ? "Pull cord to turn lamp off" : "Pull cord to turn lamp on"}
        className="absolute left-[75.8%] top-[70%] z-30 flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5d894]"
        onClick={pullCord}
        type="button"
        animate={pulling ? { y: [0, 25, -3, 0] } : { y: 0 }}
        transition={
          pulling
            ? { duration: 0.52, times: [0, 0.32, 0.68, 1], ease: "easeOut" }
            : { type: "spring", stiffness: 360, damping: 24 }
        }
      >
        <span className="h-4 w-3 rounded-sm border border-[#f4d58b] bg-[#bb9146] shadow-[0_0_16px_#e8c47555] transition group-hover:scale-110" />
      </motion.button>
    </div>
  );
}
