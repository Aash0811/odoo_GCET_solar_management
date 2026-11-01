ALTER TABLE "Delivery"
ADD COLUMN "deliveryAgentId" TEXT,
ADD COLUMN "deliveryAddress" TEXT,
ADD COLUMN "recipientPhone" TEXT,
ADD COLUMN "latitude" DECIMAL(10,7),
ADD COLUMN "longitude" DECIMAL(10,7),
ADD COLUMN "addressConfirmed" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Delivery_deliveryAgentId_status_idx"
ON "Delivery"("deliveryAgentId", "status");

ALTER TABLE "Delivery"
ADD CONSTRAINT "Delivery_deliveryAgentId_fkey"
FOREIGN KEY ("deliveryAgentId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
