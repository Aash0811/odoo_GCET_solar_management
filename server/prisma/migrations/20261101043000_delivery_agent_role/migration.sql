ALTER TYPE "UserRole" ADD VALUE 'DELIVERY_AGENT';

ALTER TABLE "PickList"
ADD COLUMN "deliveryAgentId" TEXT;

CREATE INDEX "PickList_deliveryAgentId_status_idx"
ON "PickList"("deliveryAgentId", "status");

ALTER TABLE "PickList"
ADD CONSTRAINT "PickList_deliveryAgentId_fkey"
FOREIGN KEY ("deliveryAgentId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
