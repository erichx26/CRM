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

  const properties = await prisma.property.findMany({
    include: {
      contacts: true,
      notes: { select: { id: true, content: true, createdAt: true } },
      photos: { select: { id: true, url: true, isThumbnail: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Convert to CSV
  const headers = [
    "Address",
    "City",
    "State",
    "ZIP",
    "Status",
    "Priority",
    "Follow-up Date",
    "Property Type",
    "Beds",
    "Baths",
    "Sq Ft",
    "Lot Size",
    "Year Built",
    "MLS Number",
    "Source",
    "Price",
    "Redfin URL",
    "Maps URL",
    "Created At",
    "Notes Count",
    "Contacts Count",
    "Photos Count",
  ];

  const rows = properties.map((p) => [
    p.addressRaw,
    p.city || "",
    p.state || "",
    p.zip || "",
    p.status,
    p.priority,
    p.followUpDate ? new Date(p.followUpDate).toLocaleDateString() : "",
    p.propertyType || "",
    p.beds?.toString() || "",
    p.baths?.toString() || "",
    p.squareFeet?.toString() || "",
    p.lotSize?.toString() || "",
    p.yearBuilt?.toString() || "",
    p.mlsNumber || "",
    p.source || "",
    p.price?.toString() || "",
    p.redfinUrl || "",
    p.mapsUrl || "",
    new Date(p.createdAt).toLocaleDateString(),
    p.notes.length.toString(),
    p.contacts.length.toString(),
    p.photos.length.toString(),
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
      "Content-Disposition": `attachment; filename="properties-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
