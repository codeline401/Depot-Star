const router = require("express").Router();
const prisma = require("../prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// GET toutes les ventes (admin uniquement)
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const ventes = await prisma.vente.findMany({
      include: { client: true, lignes: true },
      orderBy: { date: "desc" },
    });
    res.json(ventes);
  } catch (error) {
    console.error("Erreur chargement ventes:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des ventes." });
  }
});

// GET une vente par ID (auth)
router.get("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "id invalide." });
  }
  try {
    const vente = await prisma.vente.findUnique({
      where: { id },
      include: { client: true, lignes: true },
    });
    if (!vente) return res.status(404).json({ error: "Vente introuvable." });
    res.json(vente);
  } catch (error) {
    console.error("Erreur chargement vente:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération de la vente." });
  }
});

// POST traiter une vente (tout utilisateur authentifié)
router.post("/", authMiddleware, async (req, res) => {
  const { clientId, lignes } = req.body;

  const parsedClientId = parseInt(clientId, 10);
  if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) {
    return res
      .status(400)
      .json({ error: "clientId doit être un entier positif." });
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
    // Vérifier que le client existe
    const client = await prisma.client.findUnique({
      where: { id: parsedClientId },
    });
    if (!client) return res.status(404).json({ error: "Client introuvable." });

    // Agréger les quantités par articleId (gère les doublons)
    const qtyMap = {};
    for (const ligne of lignes) {
      const id = parseInt(ligne.articleId, 10);
      qtyMap[id] = (qtyMap[id] || 0) + parseInt(ligne.quantite, 10);
    }
    const uniqueArticleIds = Object.keys(qtyMap).map(Number);

    const articles = await prisma.article.findMany({
      where: { id: { in: uniqueArticleIds } },
    });

    if (articles.length !== uniqueArticleIds.length) {
      return res
        .status(404)
        .json({ error: "Un ou plusieurs articles introuvables." });
    }

    // Vérification des stocks
    for (const article of articles) {
      const totalRequis = qtyMap[article.id];
      if (article["quantitéStock"] < totalRequis) {
        return res.status(400).json({
          error: `Stock insuffisant pour "${article.nom}". Disponible : ${article["quantitéStock"]}, Demandé : ${totalRequis}`,
        });
      }
    }

    // Calcul des lignes de vente (snapshot des prix au moment de la vente)
    const venteLignesData = uniqueArticleIds.map((id) => {
      const article = articles.find((a) => a.id === id);
      const quantite = qtyMap[id];
      const prixConsigneUnitaire = article.aConsigner
        ? article.prixConsigne
        : 0;
      const prixTotal = (article.prix + prixConsigneUnitaire) * quantite;
      return {
        articleId: article.id,
        articleNom: article.nom,
        prixUnitaire: article.prix,
        prixConsigne: prixConsigneUnitaire,
        quantite,
        prixTotal,
      };
    });

    const total = venteLignesData.reduce((sum, l) => sum + l.prixTotal, 0);

    // Transaction atomique : décrémentation stocks + création Vente + VenteLignes
    const vente = await prisma.$transaction(
      async (tx) => {
        for (const id of uniqueArticleIds) {
          await tx.article.update({
            where: { id },
            data: { ["quantitéStock"]: { decrement: qtyMap[id] } },
          });
        }
        return tx.vente.create({
          data: {
            total,
            vendeur: req.user.alias ?? `user#${req.user.id}`,
            clientId: parsedClientId,
            lignes: { create: venteLignesData },
          },
          include: { client: true, lignes: true },
        });
      },
      { timeout: 20000 },
    );

    // Réponse enrichie pour le frontend (lignes avec snapshot article)
    res.status(201).json({
      id: vente.id,
      date: vente.date.toISOString(),
      client: vente.client,
      vendeur: vente.vendeur,
      lignes: venteLignesData.map((l) => {
        const article = articles.find((a) => a.id === l.articleId);
        return {
          article: {
            id: article.id,
            nom: article.nom,
            prix: article.prix,
            aConsigner: article.aConsigner,
            prixConsigne: article.prixConsigne,
            bottleType: article.bottleType,
          },
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          consigne: l.prixConsigne * l.quantite,
          prixTotal: l.prixTotal,
        };
      }),
      total,
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
