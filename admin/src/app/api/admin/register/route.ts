import { env } from "@/lib/env";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/admin/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[POST /api/admin/register]", err);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
