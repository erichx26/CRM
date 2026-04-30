import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const noteSchema = z.object({
  content: z.string().min(1),
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
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input" },
      { status: 400 }
    );
  }

  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const note = await prisma.note.create({
    data: {
      propertyId: id,
      content: parsed.data.content,
      createdById: session.user.id!,
    },
  });

  await prisma.activity.create({
    data: {
      propertyId: id,
      userId: session.user.id!,
      action: "NOTE_ADDED",
      details: "Note added",
    },
  });

  return NextResponse.json(note, { status: 201 });
}
