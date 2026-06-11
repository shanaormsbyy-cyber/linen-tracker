-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LinenItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "linenClientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'washing',
    "since" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due" DATETIME,
    "note" TEXT,
    "damaged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LinenItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LinenItem_linenClientId_fkey" FOREIGN KEY ("linenClientId") REFERENCES "LinenClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LinenItem" ("createdAt", "damaged", "due", "id", "linenClientId", "note", "propertyId", "since", "size", "stage", "type") SELECT "createdAt", "damaged", "due", "id", "linenClientId", "note", "propertyId", "since", "size", "stage", "type" FROM "LinenItem";
DROP TABLE "LinenItem";
ALTER TABLE "new_LinenItem" RENAME TO "LinenItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
