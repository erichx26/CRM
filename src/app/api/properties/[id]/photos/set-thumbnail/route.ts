import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { photoId } = await req.json();

  const photo = await prisma.photo.findFirst({ where: { id: photoId, propertyId: id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  await prisma.photo.updateMany({
    where: { propertyId: id, isThumbnail: true },
    data: { isThumbnail: false },
  });

  await prisma.photo.update({
    where: { id: photoId },
    data: { isThumbnail: true },
  });

  return NextResponse.json({ success: true });
}