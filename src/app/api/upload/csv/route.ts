import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeAddress, generateMapsUrl } from "@/lib/utils";
import { z } from "zod";

const importSchema = z.object({
  properties: z.array(z.object({
    addressRaw: z.string().min(1),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
    status: z.string().optional(),
    priority: z.string().optional(),
    propertyType: z.string().optional().nullable(),
    beds: z.number().optional().nullable(),
    baths: z.number().optional().nullable(),
    squareFeet: z.number().optional().nullable(),
    lotSize: z.number().optional().nullable(),
    yearBuilt: z.number().optional().nullable(),
    mlsNumber: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    price: z.number().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    redfinUrl: z.string().optional().nullable(),
  })),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Validation error:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { properties } = parsed.data;
    const results = {
      imported: 0,
      duplicates: 0,
      errors: [] as string[],
    };

    for (const prop of properties) {
      const addressNormalized = normalizeAddress(prop.addressRaw);

      // Check for duplicate
      const existing = await prisma.property.findFirst({
        where: { addressNormalized },
      });

      if (existing) {
        results.duplicates++;
        continue;
      }

      const validStatuses = ["NEW", "CONTACTED", "NEGOTIATING", "CLOSED", "DEAD"];
      const validPriorities = ["HIGH", "MEDIUM", "LOW"];

      const status = (prop.status && validStatuses.includes(prop.status.toUpperCase()))
        ? prop.status.toUpperCase()
        : "NEW";
      const priority = (prop.priority && validPriorities.includes(prop.priority.toUpperCase()))
        ? prop.priority.toUpperCase()
        : "MEDIUM";

      try {
        const property = await prisma.property.create({
          data: {
            addressRaw: prop.addressRaw,
            addressNormalized,
            city: prop.city || null,
            state: prop.state || null,
            zip: prop.zip || null,
            status: status as "NEW" | "CONTACTED" | "NEGOTIATING" | "CLOSED" | "DEAD",
            priority: priority as "HIGH" | "MEDIUM" | "LOW",
            propertyType: prop.propertyType || null,
            beds: prop.beds || null,
            baths: prop.baths || null,
            squareFeet: prop.squareFeet || null,
            lotSize: prop.lotSize || null,
            yearBuilt: prop.yearBuilt || null,
            mlsNumber: prop.mlsNumber || null,
            source: prop.source || null,
            price: prop.price || null,
            latitude: prop.latitude || null,
            longitude: prop.longitude || null,
            redfinUrl: prop.redfinUrl || null,
            mapsUrl: generateMapsUrl(prop.addressRaw, prop.city || undefined, prop.state || undefined, prop.zip || undefined),
            createdById: session.user.id!,
          },
        });

        await prisma.activity.create({
          data: {
            propertyId: property.id,
            userId: session.user.id!,
            action: "CREATED",
            details: `Property imported from CSV`,
          },
        });

        results.imported++;
      } catch (err) {
        results.errors.push(`Failed to import ${prop.addressRaw}: ${err}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
