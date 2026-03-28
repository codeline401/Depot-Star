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
    const qty = parseInt(ligne.quantite);
    if (!ligne.articleId || isNaN(qty) || qty <= 0) {
      return res
        .status(400)
        .json({
          error: "Chaque ligne doit avoir un articleId et une quantite > 0.",
        });
    }
  }

  try {
    const articleIds = lignes.map((l) => parseInt(l.articleId));

    const articles = await prisma.article.findMany({
      where: { id: { in: articleIds } },
      include: { fournisseur: true },
    });

    if (articles.length !== articleIds.length) {
      return res
        .status(404)
        .json({ error: "Un ou plusieurs articles introuvables." });
    }

    // Vérification du stock pour chaque ligne
    for (const ligne of lignes) {
      const article = articles.find((a) => a.id === parseInt(ligne.articleId));
      if (article["quantitéStock"] < parseInt(ligne.quantite)) {
        return res.status(400).json({
          error: `Stock insuffisant pour "${article.nom}". Disponible : ${article["quantitéStock"]}, Demandé : ${ligne.quantite}`,
        });
      }
    }

    // Décrémentation atomique des stocks
    await prisma.$transaction(
      lignes.map((ligne) =>
        prisma.article.update({
          where: { id: parseInt(ligne.articleId) },
          data: { ["quantitéStock"]: { decrement: parseInt(ligne.quantite) } },
        }),
      ),
    );

    // Construction de la facture
    const venteLignes = lignes.map((ligne) => {
      const article = articles.find((a) => a.id === parseInt(ligne.articleId));
      const quantite = parseInt(ligne.quantite);
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
    res
      .status(500)
      .json({
        error: "Une erreur est survenue lors du traitement de la vente.",
      });
  }
});

module.exports = router;
