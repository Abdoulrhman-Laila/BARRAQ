import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "baraq-dashboard", version: process.env.NEXT_PUBLIC_DASHBOARD_VERSION ?? "1.0.0" });
}
