-- AlterTable Vente : ajouter la consigne cageot rendue
ALTER TABLE "Vente" ADD COLUMN "consigneCageotRendue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable VenteLigne : ajouter consigne cageot et nombre de cageots
ALTER TABLE "VenteLigne" ADD COLUMN "consigneCageot" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "VenteLigne" ADD COLUMN "qteCageots" INTEGER NOT NULL DEFAULT 0;

-- CreateTable CageotRetour
CREATE TABLE "CageotRetour" (
    "id" SERIAL NOT NULL,
    "venteId" INTEGER NOT NULL,
    "capacite" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CageotRetour_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CageotRetour" ADD CONSTRAINT "CageotRetour_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
