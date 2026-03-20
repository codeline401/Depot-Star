const router = require("express").Router();
const prisma = require("../prisma"); // Import the Prisma Client instance

// GET tous les articles
export const getAllArticles = router.get("/", async (req, res) => {
  try {
    await prisma.article.findMany({
      include: {
        fournisseur: true, // Inclure les données du fournisseur associé à chaque article
      },
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching articles." });
  }
});

// GET un article par ID
export const getArticleById = router.get("/:id", async (req, res) => {
  const { id } = req.params; // Récupérer l'ID de l'article à partir des paramètres de la requête
  try {
    const article = await prisma.article.findUnique({
      where: { id: parseInt(id) }, // Trouver l'article avec l'ID spécifié
      include: {
        fournisseur: true, // Inclure les données du fournisseur associé à l'article
      },
    });

    if (!article) {
      return res.status(404).json({ error: "article not found." });
    }
    res.json(article); // Envoyer les données de l'article en réponse
  } catch (error) {
    console.error("Error fetching article:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the article." });
  }
});

// POST créer un nouvel article
export const createArticle = router.post("/", async (req, res) => {
  const { data } = req.body; // Récupérer les données de l'article à partir du corps de la requête
  try {
    const article = await prisma.article.create({
      data: {
        nom: data.nom,
        description: data.description,
        prix: data.prix,
        stock: data.stock,
        fournisseurId: data.fournisseurId, // Associer l'article à un fournisseur existant en utilisant son ID
      },
    });
    if (!article) {
      return res.status(400).json({ error: "Failed to create article." });
    }

    res.status(201).json(article); // Envoyer les données de l'article créé en réponse
  } catch (error) {
    console.error("Error creating article:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the article." });
  }
});

// PUT update article by ID
export const updateArticle = router.put("/:id", async (req, res) => {
  const { id } = req.params; // Récupérer l'ID de l'article à partir des paramètres de la requête
  const { data } = req.body; // Récupérer les données mises à jour de l'article à partir du corps de la requête

  try {
    await prisma.article.update({
      where: { id: parseInt(id) }, // Trouver l'article avec l'ID spécifié
      data: {
        nom: data.nom,
        description: data.description,
        prix: data.prix,
      },
    });
    res.status(200).json({ message: "Article updated successfully." });
  } catch (error) {
    console.error("Error updating article:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the article." });
  }
});

// DELETE suppr article by ID
export const deleteArticle = router.delete("/:id", async (req, res) => {
  const { id } = req.params; // Récupérer l'ID de l'article à partir des paramètres de la requête

  try {
    await prisma.article.delete({
      where: { id: parseInt(id) }, // Trouver l'article avec l'ID spécifié
    });
    res.status(200).json({ message: "Article deleted successfully." });
  } catch (error) {
    console.error("Error deleting article:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the article." });
  }
});
