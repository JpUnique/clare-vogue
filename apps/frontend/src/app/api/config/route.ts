import { connection, NextResponse } from "next/server";

export async function GET() {
  await connection();
  return NextResponse.json(
    {
      apiBaseUrl: process.env.BACKEND_PUBLIC_URL ?? "http://localhost:3000",
      supabaseUrl: process.env.SUPABASE_URL || null,
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || null,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
