import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canEdit } from "@/lib/permissions";

const emailSchema = z.object({
  value: z.string().email(),
  type: z.string().optional(),
  order: z.number().optional(),
});

const phoneSchema = z.object({
  value: z.string().min(1),
  type: z.string().optional(),
  order: z.number().optional(),
});

const contactSchema = z.object({
  ownerName: z.string().optional(),
  emails: z.array(emailSchema).optional(),
  phones: z.array(phoneSchema).optional(),
  updateId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const contacts = await prisma.contact.findMany({
      where: { propertyId: id },
      include: {
        emails: { orderBy: { order: "asc" } },
        phones: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canEdit(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (parsed.data.updateId) {
      const existingContact = await prisma.contact.findFirst({
        where: { id: parsed.data.updateId, propertyId: id },
        include: { emails: true, phones: true },
      });
      if (!existingContact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      // Delete existing email/phone records
      if (existingContact.emails.length > 0) {
        await prisma.email.deleteMany({ where: { contactId: parsed.data.updateId } });
      }
      if (existingContact.phones.length > 0) {
        await prisma.phone.deleteMany({ where: { contactId: parsed.data.updateId } });
      }

      // Create new email/phone records
      const emailData = (parsed.data.emails || []).map((e, i) => ({
        contactId: parsed.data.updateId!,
        value: e.value,
        type: e.type || null,
        order: e.order ?? i,
      }));

      const phoneData = (parsed.data.phones || []).map((p, i) => ({
        contactId: parsed.data.updateId!,
        value: p.value,
        type: p.type || null,
        order: p.order ?? i,
      }));

      const contact = await prisma.contact.update({
        where: { id: parsed.data.updateId },
        data: {
          ownerName: parsed.data.ownerName || null,
        },
      });

      if (emailData.length > 0) {
        await prisma.email.createMany({ data: emailData });
      }
      if (phoneData.length > 0) {
        await prisma.phone.createMany({ data: phoneData });
      }

      const updated = await prisma.contact.findUnique({
        where: { id: parsed.data.updateId },
        include: {
          emails: { orderBy: { order: "asc" } },
          phones: { orderBy: { order: "asc" } },
        },
      });

      return NextResponse.json(updated, { status: 200 });
    }

    const contact = await prisma.contact.create({
      data: {
        propertyId: id,
        ownerName: parsed.data.ownerName || null,
        emails: parsed.data.emails
          ? {
              create: parsed.data.emails.map((e, i) => ({
                value: e.value,
                type: e.type || null,
                order: e.order ?? i,
              })),
            }
          : undefined,
        phones: parsed.data.phones
          ? {
              create: parsed.data.phones.map((p, i) => ({
                value: p.value,
                type: p.type || null,
                order: p.order ?? i,
              })),
            }
          : undefined,
      },
      include: {
        emails: { orderBy: { order: "asc" } },
        phones: { orderBy: { order: "asc" } },
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
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canEdit(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: { emails: true, phones: true },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Delete existing email/phone records
    if (contact.emails.length > 0) {
      await prisma.email.deleteMany({ where: { contactId: id } });
    }
    if (contact.phones.length > 0) {
      await prisma.phone.deleteMany({ where: { contactId: id } });
    }

    // Create new email/phone records
    const emailData = (parsed.data.emails || []).map((e, i) => ({
      contactId: id,
      value: e.value,
      type: e.type || null,
      order: e.order ?? i,
    }));

    const phoneData = (parsed.data.phones || []).map((p, i) => ({
      contactId: id,
      value: p.value,
      type: p.type || null,
      order: p.order ?? i,
    }));

    await prisma.contact.update({
      where: { id },
      data: {
        ownerName: parsed.data.ownerName || null,
      },
    });

    if (emailData.length > 0) {
      await prisma.email.createMany({ data: emailData });
    }
    if (phoneData.length > 0) {
      await prisma.phone.createMany({ data: phoneData });
    }

    const updated = await prisma.contact.findUnique({
      where: { id },
      include: {
        emails: { orderBy: { order: "asc" } },
        phones: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canEdit(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
