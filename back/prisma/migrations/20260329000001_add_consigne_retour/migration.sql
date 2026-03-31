-- AlterTable: ajouter le montant total des consignes rendues sur une vente
ALTER TABLE "Vente" ADD COLUMN "consigneRendue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable: lignes de retour de consigne liées à une vente
CREATE TABLE "ConsigneRetour" (
    "id" SERIAL NOT NULL,
    "venteId" INTEGER NOT NULL,
    "articleId" INTEGER NOT NULL,
    "articleNom" TEXT NOT NULL,
    "prixConsigne" DOUBLE PRECISION NOT NULL,
    "quantite" INTEGER NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ConsigneRetour_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConsigneRetour" ADD CONSTRAINT "ConsigneRetour_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
