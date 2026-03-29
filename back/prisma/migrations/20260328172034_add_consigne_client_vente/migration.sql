-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "prixConsigne" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vente" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DOUBLE PRECISION NOT NULL,
    "vendeur" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,

    CONSTRAINT "Vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenteLigne" (
    "id" SERIAL NOT NULL,
    "venteId" INTEGER NOT NULL,
    "articleId" INTEGER NOT NULL,
    "articleNom" TEXT NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "prixConsigne" DOUBLE PRECISION NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VenteLigne_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteLigne" ADD CONSTRAINT "VenteLigne_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
