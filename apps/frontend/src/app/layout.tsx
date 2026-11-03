import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clare's Vogue | Fashion Atelier",
  description:
    "A beautiful, private space to keep every client's style journey together.",
  icons: {
    icon: [{ url: "/clare-vogue-logo.png", type: "image/png" }],
    shortcut: ["/clare-vogue-logo.png"],
    apple: [{ url: "/clare-vogue-logo.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
