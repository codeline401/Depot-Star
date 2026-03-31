-- CreateEnum
CREATE TYPE "EmballageType" AS ENUM ('BOUTEILLE', 'CAGEOT');

-- CreateTable
CREATE TABLE "Emballage" (
    "id" SERIAL NOT NULL,
    "type" "EmballageType" NOT NULL,
    "prixConsigne" DOUBLE PRECISION NOT NULL,
    "capacite" INTEGER NOT NULL DEFAULT 0,
    "quantiteStock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Emballage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Emballage_type_prixConsigne_capacite_key" ON "Emballage"("type", "prixConsigne", "capacite");
