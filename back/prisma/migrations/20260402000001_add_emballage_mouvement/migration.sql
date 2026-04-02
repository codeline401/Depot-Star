-- CreateTable
CREATE TABLE "EmballageMouvement" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emballageId" INTEGER NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "type" "MouvementType" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "motif" TEXT,
    "refId" INTEGER,

    CONSTRAINT "EmballageMouvement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmballageMouvement_emballageId_idx" ON "EmballageMouvement"("emballageId");

-- CreateIndex
CREATE INDEX "EmballageMouvement_type_idx" ON "EmballageMouvement"("type");
