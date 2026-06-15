import { env } from "@/lib/env";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = (session.user as any).backendToken;

  try {
    const body = await req.json();
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/admin/profile`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[PUT /api/admin/profile]", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
