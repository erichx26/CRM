import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizeAddress, generateRedfinUrl, generateMapsUrl } from "@/lib/utils";

const createPropertySchema = z.object({
  addressRaw: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "NEGOTIATING", "CLOSED", "DEAD"]).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  followUpDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { addressRaw: { contains: search } },
      { city: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { contacts: true, notes: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.property.count({ where }),
  ]);

  return NextResponse.json({
    properties,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  console.log("Session debug:", JSON.stringify(session));

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  console.log("User ID:", userId);

  if (!userId) {
    return NextResponse.json({ error: "User ID not found in session" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { addressRaw, city, state, zip, status, priority, followUpDate } = parsed.data;
  const addressNormalized = normalizeAddress(addressRaw);

  const existing = await prisma.property.findFirst({
    where: { addressNormalized },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Property with this address already exists" },
      { status: 409 }
    );
  }

  const property = await prisma.property.create({
    data: {
      addressRaw,
      addressNormalized,
      city,
      state,
      zip,
      status: status || "NEW",
      priority: priority || "MEDIUM",
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      redfinUrl: generateRedfinUrl(addressRaw, city, state, zip),
      mapsUrl: generateMapsUrl(addressRaw, city, state, zip),
      createdById: userId,
    },
  });

  await prisma.activity.create({
    data: {
      propertyId: property.id,
      userId: userId,
      action: "CREATED",
      details: `Property created at ${addressRaw}`,
    },
  });

  return NextResponse.json(property, { status: 201 });
}
