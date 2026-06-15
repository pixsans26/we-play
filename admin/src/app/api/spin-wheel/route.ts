import { env } from "@/lib/env";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const BACKEND_URL = env.NEXT_PUBLIC_API_URL;

async function getBackendToken() {
  const session = await auth();
  return session?.user ? (session.user as any).backendToken : null;
}

export async function GET() {
  const token = await getBackendToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${BACKEND_URL}/api/tasks/spin`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch" }, { status: res.status });
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const token = await getBackendToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const res = await fetch(`${BACKEND_URL}/api/tasks/spin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to create" }, { status: res.status });
  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: Request) {
  const token = await getBackendToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Backend handles upsert on POST
  const res = await fetch(`${BACKEND_URL}/api/tasks/spin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to update" }, { status: res.status });
  const data = await res.json();
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const token = await getBackendToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const res = await fetch(`${BACKEND_URL}/api/tasks/spin/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to delete" }, { status: res.status });
  const data = await res.json();
  return NextResponse.json(data);
}
