/**
 * Data migration script: Convert Contact JSON emails/phones to Email/Phone tables
 * Run with: npx tsx prisma/migrate_contact_data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ContactRow {
  id: string;
  emails: string;
  phones: string;
}

interface JsonEmail {
  email: string;
  type?: string;
  order?: number;
}

interface JsonPhone {
  phone: string;
  type?: string;
  order?: number;
}

async function migrate() {
  console.log('Starting contact data migration...');

  // Get all contacts with non-empty JSON arrays
  const contacts = await prisma.$queryRaw<ContactRow[]>`
    SELECT id, emails, phones FROM Contact
    WHERE emails != '[]' OR phones != '[]'
  `;

  console.log(`Found ${contacts.length} contacts with data to migrate`);

  let emailCount = 0;
  let phoneCount = 0;

  for (const contact of contacts) {
    // Parse emails JSON
    let emails: JsonEmail[] = [];
    try {
      emails = JSON.parse(contact.emails || '[]');
    } catch {
      console.warn(`Invalid emails JSON for contact ${contact.id}`);
    }

    // Parse phones JSON
    let phones: JsonPhone[] = [];
    try {
      phones = JSON.parse(contact.phones || '[]');
    } catch {
      console.warn(`Invalid phones JSON for contact ${contact.id}`);
    }

    // Insert emails
    for (const email of emails) {
      await prisma.email.create({
        data: {
          contactId: contact.id,
          value: typeof email === 'string' ? email : email.email,
          type: typeof email === 'object' ? (email.type || null) : null,
          order: typeof email === 'object' ? (email.order ?? 0) : 0,
        },
      });
      emailCount++;
    }

    // Insert phones
    for (const phone of phones) {
      await prisma.phone.create({
        data: {
          contactId: contact.id,
          value: typeof phone === 'string' ? phone : phone.phone,
          type: typeof phone === 'object' ? (phone.type || null) : null,
          order: typeof phone === 'object' ? (phone.order ?? 0) : 0,
        },
      });
      phoneCount++;
    }

    console.log(`Migrated contact ${contact.id}: ${emails.length} emails, ${phones.length} phones`);
  }

  console.log(`\nMigration complete. Inserted ${emailCount} emails and ${phoneCount} phones from ${contacts.length} contacts.`);
  console.log('You can now safely remove the legacy emails/phones columns in a follow-up migration.');
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());