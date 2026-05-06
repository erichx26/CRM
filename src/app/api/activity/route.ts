import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dateFilter = searchParams.get("date");

  let dateCondition: { gte?: Date; lte?: Date } | undefined;
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  if (dateFilter === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    dateCondition = { gte: start, lte: now };
  } else if (dateFilter === "week") {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    dateCondition = { gte: start, lte: now };
  }

  const where = dateCondition ? { createdAt: dateCondition } : {};

  const activities = await prisma.activity.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      property: { select: { id: true, addressRaw: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json(activities);
}
