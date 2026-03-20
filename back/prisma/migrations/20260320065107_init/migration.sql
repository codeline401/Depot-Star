-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SELLER');

-- CreateEnum
CREATE TYPE "BottleType" AS ENUM ('PLASTIQUE', 'VERRE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "mdp" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SELLER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fournisseur" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,

    CONSTRAINT "Fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "quantitéStock" INTEGER NOT NULL,
    "bottleType" "BottleType" NOT NULL,
    "aConsigner" BOOLEAN NOT NULL DEFAULT false,
    "fournisseurId" INTEGER NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_alias_key" ON "User"("alias");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
