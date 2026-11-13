ALTER TABLE "appointments" ALTER COLUMN "client_id" DROP NOT NULL;
ALTER TABLE "appointments" ADD COLUMN "guest_name" TEXT, ADD COLUMN "guest_email" TEXT, ADD COLUMN "guest_phone" TEXT;
ALTER TABLE "appointments" ADD CONSTRAINT "appointment_contact_required" CHECK ("client_id" IS NOT NULL OR ("guest_name" IS NOT NULL AND "guest_email" IS NOT NULL));
