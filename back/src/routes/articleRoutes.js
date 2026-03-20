const router = require("express").Router();
const prisma = require("../prisma");

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

// POST créer un nouvel article
router.post("/", async (req, res) => {
  try {
    const article = await prisma.article.create({ data: req.body });
    res.status(201).json(article);
  } catch (error) {
    console.error("Error creating article:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the article." });
  }
});

// PUT update article by ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const article = await prisma.article.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.json(article);
  } catch (error) {
    console.error("Error updating article:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the article." });
  }
});

// DELETE suppr article by ID
router.delete("/:id", async (req, res) => {
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
