-- CreateTable
CREATE TABLE "NeonAuthUserSync" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "raw_json" JSONB,

    CONSTRAINT "NeonAuthUserSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NeonAuthUserSync_email_key" ON "NeonAuthUserSync"("email");
