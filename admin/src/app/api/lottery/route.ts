import { db } from "@/lib/db";
import { lotteryCards } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) return false;
  return true;
}

export async function GET() {
  const cards = await db.select().from(lotteryCards).orderBy(lotteryCards.level);
  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { message, category, icon, level } = await req.json();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  const [card] = await db.insert(lotteryCards).values({ message, category: category || "romantic", icon: icon || "❤️", level: level || 1 }).returning();
  return NextResponse.json(card, { status: 201 });
}

export async function PUT(req: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, message, category, icon, level, active } = await req.json();
  const [updated] = await db.update(lotteryCards).set({ message, category, icon, level, active }).where(eq(lotteryCards.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  await db.delete(lotteryCards).where(eq(lotteryCards.id, id));
  return NextResponse.json({ success: true });
}
