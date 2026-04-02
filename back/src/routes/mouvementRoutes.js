const router = require("express").Router();
const prisma = require("../prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mouvements?articleId=X
// Historique des mouvements (admin). Filtrable par articleId.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { articleId } = req.query; // Récupère le paramètre de requête articleId (optionnel)
    const where = {}; // Objet de filtrage pour la requête Prisma
    if (articleId) {
      const parsedId = parseInt(articleId, 10); // Tente de convertir articleId en entier
      if (isNaN(parsedId) || parsedId <= 0) {
        // Vérifie que l'articleId est un entier positif valide
        return res.status(400).json({ error: "articleId invalide." }); // Retourne une erreur 400 si articleId est invalide
      }
      where.articleId = parsedId; // Ajoute le filtre articleId à l'objet where pour la requête Prisma
    }

    const mouvements = await prisma.mouvementStock.findMany({
      where,
      orderBy: { date: "desc" },
      take: 500,
    });
    res.json(mouvements); // Retourne la liste des mouvements de stock au format JSON
  } catch (err) {
    console.error("Erreur mouvements:", err);
    res
      .status(500)
      .json({ error: "Erreur lors du chargement des mouvements." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mouvements
// Correction manuelle du stock (admin). Motif obligatoire.
// Body: { articleId, quantite, motif }
//   quantite > 0 = entrée (ajout), < 0 = sortie (déduction)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { articleId, quantite, motif } = req.body;

    const parsedId = parseInt(articleId, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ error: "articleId invalide." });
    }

    const parsedQty = parseInt(quantite, 10);
    if (isNaN(parsedQty) || parsedQty === 0) {
      return res
        .status(400)
        .json({ error: "quantite invalide (entier non nul)." });
    }

    if (!motif || !String(motif).trim()) {
      return res
        .status(400)
        .json({ error: "motif obligatoire pour une correction." });
    }

    const article = await prisma.article.findUnique({
      where: { id: parsedId },
    });
    if (!article) {
      return res.status(404).json({ error: "Article introuvable." });
    }

    // Prevent négative stock
    const newStock = article["quantitéStock"] + parsedQty;
    if (newStock < 0) {
      return res.status(400).json({
        error: `Stock insuffisant. Stock actuel: ${article["quantitéStock"]}, correction demandée: ${parsedQty}.`,
      });
    }

    // Transaction : mise à jour stock + trace mouvement
    const [mouvement] = await prisma.$transaction([
      prisma.mouvementStock.create({
        data: {
          articleId: parsedId,
          articleNom: article.nom,
          type: "CORRECTION",
          quantite: parsedQty,
          motif: String(motif).trim(),
        },
      }),
      prisma.article.update({
        where: { id: parsedId },
        data: { ["quantitéStock"]: { increment: parsedQty } },
      }),
    ]);

    res.status(201).json(mouvement);
  } catch (err) {
    console.error("Erreur correction stock:", err);
    res.status(500).json({ error: "Erreur lors de la correction du stock." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mouvements/inventaire-physique
// Valide un inventaire physique :
//  - Articles avec écart → MouvementStock CORRECTION + mise à jour stock
//  - Emballages avec écart → mise à jour directe du stock
// Body: {
//   articles:   [{ articleId, stockReel, explication }]
//   emballages: [{ emballageId, stockReel }]
// }
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/inventaire-physique",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { articles = [], emballages = [] } = req.body;

      if (!Array.isArray(articles) || !Array.isArray(emballages)) {
        return res.status(400).json({ error: "Format invalide." });
      }

      // ── Re-lecture DB pour garantir les stocks théoriques ──────────────────
      const articleIds = articles
        .map((l) => parseInt(l.articleId, 10))
        .filter(Boolean);
      const emballageIds = emballages
        .map((l) => parseInt(l.emballageId, 10))
        .filter(Boolean);

      const [dbArticles, dbEmballages] = await Promise.all([
        articleIds.length > 0
          ? prisma.article.findMany({ where: { id: { in: articleIds } } })
          : Promise.resolve([]),
        emballageIds.length > 0
          ? prisma.emballage.findMany({ where: { id: { in: emballageIds } } })
          : Promise.resolve([]),
      ]);

      const articleMap = Object.fromEntries(dbArticles.map((a) => [a.id, a]));
      const emballageMap = Object.fromEntries(
        dbEmballages.map((e) => [e.id, e]),
      );

      // ── Calcul des écarts ──────────────────────────────────────────────────
      const rapportArticles = [];
      const rapportEmballages = [];
      const invalidItems = [];

      for (const l of articles) {
        const id = parseInt(l.articleId, 10);
        const article = articleMap[id];
        if (!article) continue;
        const theorique = article["quantitéStock"];
        const reel = parseInt(l.stockReel, 10);
        if (isNaN(reel) || reel < 0) {
          invalidItems.push({
            type: "article",
            id,
            nom: article.nom,
            stockReel: l.stockReel,
            raison: isNaN(reel) ? "valeur non numérique" : "valeur négative",
          });
          continue;
        }
        rapportArticles.push({
          articleId: id,
          nom: article.nom,
          theorique,
          reel,
          ecart: reel - theorique,
          explication: l.explication || null,
        });
      }

      for (const l of emballages) {
        const id = parseInt(l.emballageId, 10);
        const emballage = emballageMap[id];
        if (!emballage) continue;
        const theorique = emballage.quantiteStock;
        const reel = parseInt(l.stockReel, 10);
        if (isNaN(reel) || reel < 0) {
          invalidItems.push({
            type: "emballage",
            id,
            targetLabel: `${emballage.type} cap.${emballage.capacite}`,
            stockReel: l.stockReel,
            raison: isNaN(reel) ? "valeur non numérique" : "valeur négative",
          });
          continue;
        }
        rapportEmballages.push({
          emballageId: id,
          type: emballage.type,
          prixConsigne: emballage.prixConsigne,
          capacite: emballage.capacite,
          theorique,
          reel,
          ecart: reel - theorique,
        });
      }

      if (invalidItems.length > 0) {
        return res.status(400).json({
          error:
            "Certains articles ou emballages ont une valeur de stock invalide.",
          invalidItems,
        });
      }

      // ── Transaction : appliquer les corrections ────────────────────────────
      await prisma.$transaction(async (tx) => {
        for (const r of rapportArticles) {
          if (r.ecart !== 0) {
            await tx.article.update({
              where: { id: r.articleId },
              data: { ["quantitéStock"]: { increment: r.ecart } },
            });
            await tx.mouvementStock.create({
              data: {
                articleId: r.articleId,
                articleNom: r.nom,
                type: "CORRECTION",
                quantite: r.ecart,
                motif: `Inventaire physique${r.explication ? " — " + r.explication : ""}`,
              },
            });
          }
        }
        for (const r of rapportEmballages) {
          if (r.ecart !== 0) {
            await tx.emballage.update({
              where: { id: r.emballageId },
              data: { quantiteStock: { increment: r.ecart } },
            });
            await tx.emballageMouvement.create({
              data: {
                emballageId: r.emballageId,
                targetLabel: `${r.type} cap.${r.capacite}`,
                type: "CORRECTION",
                quantite: r.ecart,
                motif: "Inventaire physique",
              },
            });
          }
        }
      });

      res.json({ articles: rapportArticles, emballages: rapportEmballages });
    } catch (err) {
      console.error("Erreur inventaire physique:", err);
      res.status(500).json({
        error: "Erreur lors de la validation de l'inventaire physique.",
      });
    }
  },
);

module.exports = router;
