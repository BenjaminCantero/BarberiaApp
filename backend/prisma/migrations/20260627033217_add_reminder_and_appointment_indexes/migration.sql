-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "reminder_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "appointments_barber_id_start_at_status_idx" ON "appointments"("barber_id", "start_at", "status");

-- CreateIndex
CREATE INDEX "appointments_client_id_start_at_idx" ON "appointments"("client_id", "start_at");
