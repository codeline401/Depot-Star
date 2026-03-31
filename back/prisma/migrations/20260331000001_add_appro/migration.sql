-- CreateEnum
CREATE TYPE "ApproStatus" AS ENUM ('VERIFIE', 'VALIDE');

-- CreateTable Appro
CREATE TABLE "Appro" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidation" TIMESTAMP(3),
    "status" "ApproStatus" NOT NULL DEFAULT 'VERIFIE',
    "coutTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Appro_pkey" PRIMARY KEY ("id")
);

-- CreateTable ApproLigne
CREATE TABLE "ApproLigne" (
    "id" SERIAL NOT NULL,
    "approId" INTEGER NOT NULL,
    "articleId" INTEGER NOT NULL,
    "articleNom" TEXT NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "qteCommandee" INTEGER NOT NULL,
    "coutLigne" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ApproLigne_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ApproLigne" ADD CONSTRAINT "ApproLigne_approId_fkey"
    FOREIGN KEY ("approId") REFERENCES "Appro"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
