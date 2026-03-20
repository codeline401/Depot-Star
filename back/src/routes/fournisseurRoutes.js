const router = require("express").Router();
const prisma = require("../prisma");

// GET tous les fournisseurs
router.get("/", async (req, res) => {
  try {
    const fournisseurs = await prisma.fournisseur.findMany({
      include: { listeArticles: true },
    });
    res.json(fournisseurs);
  } catch (error) {
    console.error("Error fetching fournisseurs:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching fournisseurs." });
  }
});

// GET fournisseur par ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id: parseInt(id) },
      include: { listeArticles: true },
    });
    if (!fournisseur) {
      return res.status(404).json({ error: "Fournisseur not found." });
    }
    res.json(fournisseur);
  } catch (error) {
    console.error("Error fetching fournisseur:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the fournisseur." });
  }
});

// POST créer un nouveau fournisseur
router.post("/", async (req, res) => {
  try {
    const fournisseur = await prisma.fournisseur.create({ data: req.body });
    res.status(201).json(fournisseur);
  } catch (error) {
    console.error("Error creating fournisseur:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the fournisseur." });
  }
});

// PUT mettre à jour un fournisseur
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const fournisseur = await prisma.fournisseur.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.json(fournisseur);
  } catch (error) {
    console.error("Error updating fournisseur:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the fournisseur." });
  }
});

// DELETE supprimer un fournisseur
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.fournisseur.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Fournisseur deleted successfully." });
  } catch (error) {
    console.error("Error deleting fournisseur:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the fournisseur." });
  }
});

module.exports = router;
