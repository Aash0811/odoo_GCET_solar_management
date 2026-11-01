ALTER TYPE "DeliveryStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "DeliveryStatus" ADD VALUE 'IN_TRANSIT';
ALTER TYPE "DeliveryStatus" ADD VALUE 'ARRIVED';

ALTER TABLE "Delivery"
ADD COLUMN "customerAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "customerAcceptedAt" TIMESTAMP(3),
ADD COLUMN "acceptanceSignature" TEXT,
ADD COLUMN "acceptanceNotes" TEXT;
