-- CreateTable
CREATE TABLE "LinenClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinenClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "linenClientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinenItem" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "linenClientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'washing',
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due" TIMESTAMP(3),
    "note" TEXT,
    "damaged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinenItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinenClient_token_key" ON "LinenClient"("token");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_linenClientId_fkey" FOREIGN KEY ("linenClientId") REFERENCES "LinenClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinenItem" ADD CONSTRAINT "LinenItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinenItem" ADD CONSTRAINT "LinenItem_linenClientId_fkey" FOREIGN KEY ("linenClientId") REFERENCES "LinenClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
