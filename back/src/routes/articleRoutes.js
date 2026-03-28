const router = require("express").Router();
const prisma = require("../prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// GET tous les articles
router.get("/", async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      include: { fournisseur: true },
    });
    res.json(articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching articles." });
  }
});

// GET un article par ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const article = await prisma.article.findUnique({
      where: { id: parseInt(id) },
      include: { fournisseur: true },
    });
    if (!article) {
      return res.status(404).json({ error: "Article not found." });
    }
    res.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the article." });
  }
});

// POST créer un nouvel article (admin seulement)
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { nom, prix, quantiteStock, bottleType, aConsigner, fournisseurId } = req.body;
    const article = await prisma.article.create({
      data: { nom, prix, ["quantitéStock"]: quantiteStock, bottleType, aConsigner, fournisseurId },
    });
    res.status(201).json(article);
  } catch (error) {
    console.error("Error creating article:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the article." });
  }
});

// PUT update article by ID (admin seulement)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const { nom, prix, quantiteStock, bottleType, aConsigner, fournisseurId } =
      req.body;
    const article = await prisma.article.update({
      where: { id: parseInt(id) },
      data: { nom, prix, ["quantitéStock"]: quantiteStock, bottleType, aConsigner, fournisseurId },
    });
    res.json(article);
  } catch (error) {
    console.error("Error updating article:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the article." });
  }
});

// DELETE suppr article by ID (admin seulement)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.article.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Article deleted successfully." });
  } catch (error) {
    console.error("Error deleting article:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the article." });
  }
});

module.exports = router;
