const router = require("express").Router();
const prisma = require("../prisma"); // Import the Prisma Client instance

// GET tous les fournisseurs
export const getAllFournisseurs = router.get("/", async (req, res) => {
  try {
    const fournisseurs = await prisma.fournisseur.findMany({
      include: { listeArticles: true }, // Inclure les données des articles associés à chaque fournisseur
    });
    if (!fournisseurs) {
      return res.status(404).json({ error: "fournisseurs not found." });
    }

    res.json(fournisseurs); // Envoyer les données des fournisseurs en réponse
  } catch (error) {
    console.error("Error fetching fournisseurs:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the fournisseurs." });
  }
});

// GET fournissuer par ID
export const getFournisseurById = router.get("/:id", async (req, res) => {
  const { id } = req.params; // Récupérer l'ID du fournisseur à partir des paramètres de la requête
  try {
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id: parseInt(id) }, // Trouver le fournisseur avec l'ID spécifié
      include: { listeArticles: true }, // Inclure les données des articles associés au fournisseur
    });
    if (!fournisseur) {
      return res.status(404).json({ error: "fournisseur not found." });
    }

    res.json(fournisseur); // Envoyer les données du fournisseur en réponse
  } catch (error) {
    console.error("Error fetching fournisseur:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the fournisseur." });
  }
});

// POST créer un nouveau fournisseur
export const createFournisseur = router.post("/", async (req, res) => {
  const { data } = req.body; // Récupérer les données du fournisseur à partir du corps de la requête
  try {
    const fournisseur = await prisma.fournisseur.create({
      data: {
        nom: data.nom,
        adresse: data.adresse,
        email: data.email,
        telephone: data.telephone,
      },
    });
    res.json(fournisseur); // Envoyer les données du fournisseur créé en réponse
  } catch (error) {
    console.error("Error creating fournisseur:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the fournisseur." });
  }
});

//PUT mettre à jour un fournisseur
export const updateFournisseur = router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { data } = req.body; // Récupérer les données mises à jour du fournisseur à partir du corps de la requête
  try {
    const fournisseur = await prisma.fournisseur.update({
      where: { id: parseInt(id) }, // Trouver le fournisseur avec l'ID spécifié
      data: {
        nom: data.nom,
        adresse: data.adresse,
        email: data.email,
        telephone: data.telephone,
      },
    });
    if (!fournisseur) {
      return res.status(404).json({ error: "fournisseur not found." });
    }
    res.json(fournisseur); // Envoyer les données du fournisseur mis à jour en réponse
  } catch (error) {
    console.error("Error updating fournisseur:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the fournisseur." });
  }
});

// DELETE supprimer un fournisseur
export const deleteFournisseur = router.delete("/:id", async (req, res) => {
  const { id } = req.params; // Récupérer l'ID du fournisseur à partir des paramètres de la requête
  try {
    const fournisseur = await prisma.fournisseur.delete({
      where: { id: parseInt(id) }, // Trouver le fournisseur avec l'ID spécifié
      include: { listeArticles: true }, // Inclure les données des articles associés au fournisseur
    });
    if (!fournisseur) {
      return res.status(404).json({ error: "fournisseur not found." });
    }
    res.json(fournisseur); // Envoyer les données du fournisseur supprimé en réponse
  } catch (error) {
    console.error("Error deleting fournisseur:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the fournisseur." });
  }
});
