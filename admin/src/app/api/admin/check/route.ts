import { env } from "@/lib/env";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/admin/check`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ hasAdmin: false }, { status: 500 });
  }
}
