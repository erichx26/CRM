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
      contacts: { include: { emails: true, phones: true } },
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
    "Contact Name",
    "Emails",
    "Phone Numbers",
    "Notes Count",
    "Photos Count",
  ];

  // Helper to extract contact info from first contact (or empty strings)
  const getContactInfo = (contacts: typeof properties[0]["contacts"]) => {
    if (contacts.length === 0) {
      return { name: "", emails: "", phones: "" };
    }
    const first = contacts[0];
    const name = first.ownerName || "";
    const emails = first.emails.map((e) => e.value).filter(Boolean).join("; ");
    const phones = first.phones.map((p) => p.value).filter(Boolean).join("; ");
    return { name, emails, phones };
  };

  // Prevent CSV formula injection — prefix cells starting with =, +, -, @ with '
  const sanitizeCsvCell = (value: string): string => {
    const trimmed = String(value).trim();
    if (/^[=+\-@]/.test(trimmed)) {
      return `'${trimmed}`;
    }
    return trimmed;
  };

  const rows = properties.map((p) => {
    const { name, emails, phones } = getContactInfo(p.contacts);
    return [
      sanitizeCsvCell(p.addressRaw),
      sanitizeCsvCell(p.city || ""),
      sanitizeCsvCell(p.state || ""),
      sanitizeCsvCell(p.zip || ""),
      p.status,
      p.priority,
      p.followUpDate ? new Date(p.followUpDate).toLocaleDateString() : "",
      sanitizeCsvCell(p.propertyType || ""),
      p.beds?.toString() || "",
      p.baths?.toString() || "",
      p.squareFeet?.toString() || "",
      p.lotSize?.toString() || "",
      p.yearBuilt?.toString() || "",
      sanitizeCsvCell(p.mlsNumber || ""),
      sanitizeCsvCell(p.source || ""),
      p.price?.toString() || "",
      sanitizeCsvCell(p.redfinUrl || ""),
      sanitizeCsvCell(p.mapsUrl || ""),
      new Date(p.createdAt).toLocaleDateString(),
      sanitizeCsvCell(name),
      sanitizeCsvCell(emails),
      sanitizeCsvCell(phones),
      p.notes.length.toString(),
      p.photos.length.toString(),
    ];
  });

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
