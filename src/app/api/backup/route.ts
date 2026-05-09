import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [properties, users, activities, contacts, emails, phones, notes, photos] = await Promise.all([
    prisma.property.findMany({ include: { contacts: { include: { emails: true, phones: true } }, notes: true, photos: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.activity.findMany({ include: { user: { select: { name: true } }, property: { select: { addressRaw: true } } } }),
    prisma.contact.findMany(),
    prisma.email.findMany(),
    prisma.phone.findMany(),
    prisma.note.findMany(),
    prisma.photo.findMany(),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    exportedBy: session.user.email,
    data: {
      properties,
      users,
      activities,
      contacts,
      emails,
      phones,
      notes,
      photos,
    },
  };

  return NextResponse.json(backup, {
    headers: {
      "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
