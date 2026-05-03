import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizeAddress, generateRedfinUrl, generateMapsUrl } from "@/lib/utils";

const updatePropertySchema = z.object({
  addressRaw: z.string().min(1).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "NEGOTIATING", "CLOSED", "DEAD"]).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  followUpDate: z.string().optional().nullable(),
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      contacts: true,
      notes: { include: { createdBy: true }, orderBy: { createdAt: "desc" } },
      photos: { orderBy: { createdAt: "asc" } },
      activities: { include: { user: true }, orderBy: { createdAt: "desc" } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return NextResponse.json(property);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  console.log("PATCH session:", JSON.stringify(session));

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  console.log("PATCH userId:", userId);

  if (!userId) {
    return NextResponse.json({ error: "User ID not found in session" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updatePropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const { addressRaw, city, state, zip, status, priority, followUpDate, propertyType, beds, baths, squareFeet, lotSize, yearBuilt, mlsNumber, source, price } = parsed.data;

  let addressNormalized = existing.addressNormalized;
  if (addressRaw) {
    addressNormalized = normalizeAddress(addressRaw);
    const duplicate = await prisma.property.findFirst({
      where: { addressNormalized, NOT: { id } },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Property with this address already exists" },
        { status: 409 }
      );
    }
  }

  const property = await prisma.property.update({
    where: { id },
    data: {
      ...(addressRaw && { addressRaw, addressNormalized }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(zip !== undefined && { zip }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(followUpDate !== undefined && {
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      }),
      ...(propertyType !== undefined && { propertyType }),
      ...(beds !== undefined && { beds: beds ? parseInt(beds) : null }),
      ...(baths !== undefined && { baths: baths ? parseFloat(baths) : null }),
      ...(squareFeet !== undefined && { squareFeet: squareFeet ? parseInt(squareFeet) : null }),
      ...(lotSize !== undefined && { lotSize: lotSize ? parseInt(lotSize) : null }),
      ...(yearBuilt !== undefined && { yearBuilt: yearBuilt ? parseInt(yearBuilt) : null }),
      ...(mlsNumber !== undefined && { mlsNumber }),
      ...(source !== undefined && { source }),
      ...(price !== undefined && { price: price ? parseInt(price) : null }),
      redfinUrl: addressRaw
        ? generateRedfinUrl(addressRaw, city ?? existing.city ?? undefined, state ?? existing.state ?? undefined, zip ?? existing.zip ?? undefined)
        : undefined,
      mapsUrl: addressRaw
        ? generateMapsUrl(addressRaw, city ?? existing.city ?? undefined, state ?? existing.state ?? undefined, zip ?? existing.zip ?? undefined)
        : undefined,
    },
  });

  if (status && status !== existing.status) {
    await prisma.activity.create({
      data: {
        propertyId: property.id,
        userId: userId,
        action: "STATUS_CHANGED",
        details: `Status changed from ${existing.status} to ${status}`,
      },
    });
  }

  await prisma.activity.create({
    data: {
      propertyId: property.id,
      userId: userId,
      action: "UPDATED",
      details: "Property updated",
    },
  });

  return NextResponse.json(property);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.property.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
