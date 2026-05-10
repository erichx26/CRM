import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizeAddress, generateRedfinUrl, generateMapsUrl } from "@/lib/utils";
import { canEdit } from "@/lib/permissions";

const createPropertySchema = z.object({
  addressRaw: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "NEGOTIATING", "CLOSED", "DEAD"]).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  followUpDate: z.string().optional(),
  propertyType: z.string().optional(),
  beds: z.string().optional(),
  baths: z.string().optional(),
  squareFeet: z.string().optional(),
  lotSize: z.string().optional(),
  yearBuilt: z.string().optional(),
  mlsNumber: z.string().optional(),
  source: z.string().optional(),
  price: z.string().optional(),
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
  const followUp = searchParams.get("followUp");

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { addressRaw: { contains: search } },
      { city: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (followUp === "upcoming") {
    where.followUpDate = { gte: new Date(new Date().setHours(0, 0, 0, 0)) };
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { contacts: { include: { emails: true, phones: true } }, notes: true },
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
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canEdit(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = session.user.id;

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

    const { addressRaw, city, state, zip, status, priority, followUpDate, propertyType, beds, baths, squareFeet, lotSize, yearBuilt, mlsNumber, source, price } = parsed.data;
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
        followUpDate: followUpDate
          ? (() => { const [y, m, d] = followUpDate.split('-').map(Number); return new Date(y, m - 1, d); })()
          : null,
        redfinUrl: generateRedfinUrl(addressRaw, city, state, zip),
        mapsUrl: generateMapsUrl(addressRaw, city, state, zip),
        createdById: userId,
        propertyType: propertyType || null,
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseInt(baths) : null,
        squareFeet: squareFeet ? parseInt(squareFeet) : null,
        lotSize: lotSize ? parseFloat(lotSize) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        mlsNumber: mlsNumber || null,
        source: source || null,
        price: price ? parseFloat(price) : null,
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
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
