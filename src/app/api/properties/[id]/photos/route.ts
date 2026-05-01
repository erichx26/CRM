import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const photos = await prisma.photo.findMany({
    where: { propertyId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(photos);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "properties", id);
  await mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  const url = `/uploads/properties/${id}/${filename}`;

  const photo = await prisma.photo.create({
    data: {
      propertyId: id,
      url,
      filename: file.name,
    },
  });

  await prisma.activity.create({
    data: {
      propertyId: id,
      userId: session.user.id!,
      action: "PHOTO_ADDED",
      details: `Photo added: ${file.name}`,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}