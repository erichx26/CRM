import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

function generateSecureTempPassword(): string {
  const specials = "!@#$%^&*";
  function getChar(src: string): string {
    const arr = new Uint8Array(1);
    crypto.getRandomValues(arr);
    return src[arr[0] % src.length];
  }
  const uuid = randomUUID().replace(/-/g, "");
  const upper = getChar("ABCDEFGHJKLMNPQRSTUVWXYZ");
  const lower = getChar("abcdefghjkmnpqrstuvwxyz");
  const num = getChar("0123456789");
  const spec = getChar(specials);
  return `${spec}${upper}${lower}${num}${uuid.slice(0, 6)}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tempPassword = generateSecureTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ id: user.id, tempPassword });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
