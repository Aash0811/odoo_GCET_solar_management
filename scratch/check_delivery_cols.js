const prisma = require('../server/src/config/prisma');

async function main() {
  const result = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'Delivery'");
  console.log('Columns in Delivery:', result.map((r) => r.column_name));

  // Check if customerAccepted exists
  const hasCol = result.some((r) => r.column_name === 'customerAccepted');
  if (!hasCol) {
    console.log('Adding missing columns to Delivery table...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Delivery" 
      ADD COLUMN IF NOT EXISTS "deliveredTo" TEXT,
      ADD COLUMN IF NOT EXISTS "deliveryAgentId" TEXT,
      ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT,
      ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT,
      ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS "addressConfirmed" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "customerAccepted" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "customerAcceptedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "acceptanceSignature" TEXT,
      ADD COLUMN IF NOT EXISTS "acceptanceNotes" TEXT;
    `);
    console.log('Missing columns added successfully!');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

