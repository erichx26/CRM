import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const sanitizeCsvCell = (value: string): string => {
  const trimmed = String(value).trim();
  if (/^[=+\-@]/.test(trimmed)) return `'${trimmed}`;
  return trimmed;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activities = await prisma.activity.findMany({
      include: {
        user: { select: { name: true, email: true } },
        property: { select: { addressRaw: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Convert to CSV
    const headers = ["Date", "Time", "User", "Action", "Property", "Details"];

    const rows = activities.map((a) => [
      new Date(a.createdAt).toLocaleDateString(),
      new Date(a.createdAt).toLocaleTimeString(),
      sanitizeCsvCell(a.user?.name || "Unknown"),
      sanitizeCsvCell(a.action),
      sanitizeCsvCell(a.property?.addressRaw || "Unknown"),
      sanitizeCsvCell(a.details || ""),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="activity-log-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
