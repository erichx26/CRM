import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
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
    orderBy: { createdAt: "asc" },
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
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const uploadDir = path.join(process.cwd(), "public", "uploads", "properties", id);
  await mkdir(uploadDir, { recursive: true });

  const photos = [];
  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      continue;
    }
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
    photos.push(photo);
  }

  await prisma.activity.create({
    data: {
      propertyId: id,
      userId: session.user.id!,
      action: "PHOTO_ADDED",
      details: `${photos.length} photo(s) added`,
    },
  });

  return NextResponse.json(photos, { status: 201 });
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
  const photoId = searchParams.get("photoId");
  const deleteAll = searchParams.get("deleteAll") === "true";

  if (deleteAll) {
    const photos = await prisma.photo.findMany({ where: { propertyId: id } });
    for (const photo of photos) {
      const filepath = path.join(process.cwd(), "public", photo.url);
      try { await unlink(filepath); } catch {}
      await prisma.photo.delete({ where: { id: photo.id } });
    }
    await prisma.activity.create({
      data: {
        propertyId: id,
        userId: session.user.id!,
        action: "PHOTO_DELETED" as any,
        details: "All photos deleted",
      },
    });
    return NextResponse.json({ success: true });
  }

  if (!photoId) {
    return NextResponse.json({ error: "photoId is required" }, { status: 400 });
  }

  const photo = await prisma.photo.findFirst({ where: { id: photoId, propertyId: id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const filepath = path.join(process.cwd(), "public", photo.url);
  try { await unlink(filepath); } catch {}
  await prisma.photo.delete({ where: { id: photoId } });

  await prisma.activity.create({
      data: {
        propertyId: id,
        userId: session.user.id!,
        action: "PHOTO_DELETED" as any,
        details: "Photo deleted",
      },
    });

  return NextResponse.json({ success: true });
}