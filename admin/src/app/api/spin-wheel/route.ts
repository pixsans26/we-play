import { db } from "@/lib/db";
import { spinWheelItems } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) return false;
  return true;
}

export async function GET() {
  const tasks = await db.select().from(spinWheelItems).orderBy(spinWheelItems.level);
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { label, emoji, color, level } = await req.json();
  if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });
  const [item] = await db.insert(spinWheelItems).values({ label, emoji: emoji || "🎯", color: color || "#FF6B9D", level: level || 1 }).returning();
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, label, emoji, color, level, active } = await req.json();
  const [updated] = await db.update(spinWheelItems).set({ label, emoji, color, level, active }).where(eq(spinWheelItems.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  await db.delete(spinWheelItems).where(eq(spinWheelItems.id, id));
  return NextResponse.json({ success: true });
}
