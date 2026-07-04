-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "barber_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_appointment_id_key" ON "reviews"("appointment_id");

-- CreateIndex
CREATE INDEX "reviews_barber_id_idx" ON "reviews"("barber_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
