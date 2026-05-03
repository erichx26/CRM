import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contactSchema = z.object({
  ownerName: z.string().optional(),
  emails: z.string().optional(),
  phones: z.string().optional(),
  updateId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  if (parsed.data.updateId) {
    const existingContact = await prisma.contact.findFirst({ where: { id: parsed.data.updateId, propertyId: id } });
    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    const contact = await prisma.contact.update({
      where: { id: parsed.data.updateId },
      data: {
        ownerName: parsed.data.ownerName || null,
        emails: parsed.data.emails || "[]",
        phones: parsed.data.phones || "[]",
      },
    });
    return NextResponse.json(contact, { status: 200 });
  }

  const contact = await prisma.contact.create({
    data: {
      propertyId: id,
      ownerName: parsed.data.ownerName || null,
      emails: parsed.data.emails || "[]",
      phones: parsed.data.phones || "[]",
    },
  });

  await prisma.activity.create({
    data: {
      propertyId: id,
      userId: session.user.id!,
      action: "CONTACT_ADDED",
      details: "Contact added",
    },
  });

  return NextResponse.json(contact, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      ownerName: parsed.data.ownerName || null,
      emails: parsed.data.emails || "[]",
      phones: parsed.data.phones || "[]",
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");

  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({ where: { id: contactId, propertyId: id } });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await prisma.contact.delete({ where: { id: contactId } });

  return NextResponse.json({ success: true });
}
