const router = require("express").Router();
const prisma = require("../prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Retourne la capacité d'un cageot selon le prix de consigne bouteille associé
function getCapaciteFromBouteillePrix(prixConsigne) {
  if (prixConsigne === 700) return 12;
  if (prixConsigne === 500) return 20;
  if (prixConsigne === 300) return 24;
  return null;
}

// GET tous les emballages
router.get("/", async (req, res) => {
  try {
    const emballages = await prisma.emballage.findMany({
      orderBy: [{ type: "asc" }, { prixConsigne: "asc" }],
    });
    res.json(emballages);
  } catch (error) {
    console.error("Error fetching emballages:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching emballages." });
  }
});

// POST créer un emballage (admin)
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { type, prixConsigne, capacite, quantiteStock } = req.body;

    if (!["BOUTEILLE", "CAGEOT"].includes(type)) {
      return res
        .status(400)
        .json({ error: "Type invalide (BOUTEILLE ou CAGEOT)." });
    }

    let finalPrixConsigne = Number(prixConsigne);
    let finalCapacite = 0;

    if (type === "BOUTEILLE") {
      if (![300, 500, 700].includes(finalPrixConsigne)) {
        return res
          .status(400)
          .json({
            error:
              "Prix de consigne invalide pour une bouteille (300, 500 ou 700 Ar).",
          });
      }
      finalCapacite = 0;
    } else {
      // CAGEOT
      finalPrixConsigne = 8000;
      finalCapacite = Number(capacite);
      if (![12, 20, 24].includes(finalCapacite)) {
        return res
          .status(400)
          .json({
            error:
              "Capacité invalide pour un cageot (12, 20 ou 24 bouteilles).",
          });
      }
    }

    const parsedQty = parseInt(quantiteStock, 10);
    if (!Number.isInteger(parsedQty) || isNaN(parsedQty) || parsedQty < 0) {
      return res
        .status(400)
        .json({ error: "quantiteStock doit être un entier positif ou nul." });
    }

    const emballage = await prisma.emballage.create({
      data: {
        type,
        prixConsigne: finalPrixConsigne,
        capacite: finalCapacite,
        quantiteStock: parsedQty,
      },
    });
    res.status(201).json(emballage);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Cet emballage existe déjà." });
    }
    console.error("Error creating emballage:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the emballage." });
  }
});

// PUT mettre à jour le stock d'un emballage (admin)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const parsedId = parseInt(req.params.id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "ID invalide." });
  }
  try {
    const { quantiteStock } = req.body;

    if (quantiteStock === undefined || quantiteStock === null) {
      return res.status(400).json({ error: "quantiteStock est requis." });
    }

    const parsedQty = parseInt(quantiteStock, 10);
    if (!Number.isInteger(parsedQty) || isNaN(parsedQty) || parsedQty < 0) {
      return res
        .status(400)
        .json({ error: "quantiteStock doit être un entier positif ou nul." });
    }

    const emballage = await prisma.emballage.update({
      where: { id: parsedId },
      data: { quantiteStock: parsedQty },
    });
    res.json(emballage);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Emballage introuvable." });
    }
    console.error("Error updating emballage:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the emballage." });
  }
});

// DELETE emballage (admin)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.emballage.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Emballage deleted successfully." });
  } catch (error) {
    console.error("Error deleting emballage:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the emballage." });
  }
});

module.exports = router;
