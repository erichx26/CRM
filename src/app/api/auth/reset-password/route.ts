import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { token, password } = parsed.data;

    // Find all non-used, non-expired tokens for this user and check against each
    const resetTokens = await prisma.passwordResetToken.findMany({
      where: { used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    let validTokenId: string | null = null;
    for (const rt of resetTokens) {
      const match = await bcrypt.compare(token, rt.tokenHash);
      if (match) {
        validTokenId = rt.id;
        break;
      }
    }

    if (!validTokenId) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    // Mark token as used and update password atomically
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.passwordResetToken.update({ where: { id: validTokenId }, data: { used: true } }),
      prisma.user.update({ where: { id: resetTokens.find(rt => rt.id === validTokenId)!.userId }, data: { password: hashedPassword } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
