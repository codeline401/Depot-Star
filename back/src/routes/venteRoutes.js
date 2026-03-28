const router = require("express").Router();
const prisma = require("../prisma");
const { authMiddleware } = require("../middleware/auth");

const CONSIGNE_SUPPLEMENT = 700;

// POST traiter une vente (tout utilisateur authentifié)
router.post("/", authMiddleware, async (req, res) => {
  const { clientNom, lignes } = req.body;

  if (!clientNom || typeof clientNom !== "string" || !clientNom.trim()) {
    return res.status(400).json({ error: "Le nom du client est requis." });
  }
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return res
      .status(400)
      .json({ error: "Au moins une ligne de commande est requise." });
  }
  for (const ligne of lignes) {
    const articleId = parseInt(ligne.articleId, 10);
    const qty = parseInt(ligne.quantite, 10);
    if (
      !Number.isInteger(articleId) ||
      articleId <= 0 ||
      isNaN(qty) ||
      qty <= 0
    ) {
      return res.status(400).json({
        error:
          "Chaque ligne doit avoir un articleId entier positif et une quantite > 0.",
      });
    }
  }

  try {
    // Aggregate quantities by articleId to handle duplicate lines
    const qtyMap = {};
    for (const ligne of lignes) {
      const id = parseInt(ligne.articleId, 10);
      qtyMap[id] = (qtyMap[id] || 0) + parseInt(ligne.quantite, 10);
    }
    const uniqueArticleIds = Object.keys(qtyMap).map(Number);

    const articles = await prisma.article.findMany({
      where: { id: { in: uniqueArticleIds } },
      include: { fournisseur: true },
    });

    if (articles.length !== uniqueArticleIds.length) {
      return res
        .status(404)
        .json({ error: "Un ou plusieurs articles introuvables." });
    }

    // Vérification du stock (quantités agrégées)
    for (const article of articles) {
      const totalRequis = qtyMap[article.id];
      if (article["quantitéStock"] < totalRequis) {
        return res.status(400).json({
          error: `Stock insuffisant pour "${article.nom}". Disponible : ${article["quantitéStock"]}, Demandé : ${totalRequis}`,
        });
      }
    }

    // Décrémentation atomique des stocks
    await prisma.$transaction(
      uniqueArticleIds.map((id) =>
        prisma.article.update({
          where: { id },
          data: { ["quantitéStock"]: { decrement: qtyMap[id] } },
        }),
      ),
    );

    // Construction de la facture (une ligne par article unique)
    const venteLignes = uniqueArticleIds.map((id) => {
      const article = articles.find((a) => a.id === id);
      const quantite = qtyMap[id];
      const consigne = article.aConsigner ? CONSIGNE_SUPPLEMENT : 0;
      const prixTotal = (article.prix + consigne) * quantite;
      return {
        article: {
          id: article.id,
          nom: article.nom,
          prix: article.prix,
          aConsigner: article.aConsigner,
          bottleType: article.bottleType,
        },
        quantite,
        prixUnitaire: article.prix,
        consigne: consigne * quantite,
        prixTotal,
      };
    });

    const total = venteLignes.reduce((sum, l) => sum + l.prixTotal, 0);

    res.status(200).json({
      date: new Date().toISOString(),
      clientNom: clientNom.trim(),
      lignes: venteLignes,
      total,
      vendeur: req.user.alias,
    });
  } catch (error) {
    console.error("Erreur traitement vente:", error);
    res.status(500).json({
      error: "Une erreur est survenue lors du traitement de la vente.",
    });
  }
});

module.exports = router;
