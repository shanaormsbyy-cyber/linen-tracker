-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "itemTypes" TEXT NOT NULL DEFAULT 'Protector,Inner',
    "sizes" TEXT NOT NULL DEFAULT 'Single,Double,King,Super King',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
