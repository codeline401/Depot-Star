const router = require("express").Router();
const prisma = require("../prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/appros
// Crée un ordre d'approvisionnement avec le status VERIFIE.
// Appelé quand le vendeur clique sur "Checker l'appro".
//
// Body: { lignes: [{ articleId, articleNom, prixUnitaire, qteCommandee }] }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { lignes } = req.body;

    // ── 1. Validation ────────────────────────────────────────────────────────
    if (!Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ error: "La liste d'appro est vide." });
    }

    for (const l of lignes) {
      if (
        !Number.isInteger(l.articleId) ||
        !Number.isFinite(l.prixUnitaire) ||
        l.prixUnitaire < 0 ||
        !Number.isInteger(l.qteCommandee) ||
        l.qteCommandee <= 0
      ) {
        return res
          .status(400)
          .json({ error: "Données de ligne invalides.", ligne: l });
      }
    }

    // ── 2. Récupérer les articles depuis la base ──────────────────────────────
    // On récupère les noms depuis la DB pour garantir l'intégrité des enregistrements.
    const articleIds = [...new Set(lignes.map((l) => l.articleId))];
    const dbArticles = await prisma.article.findMany({
      where: { id: { in: articleIds } },
    });
    if (dbArticles.length !== articleIds.length) {
      return res
        .status(404)
        .json({ error: "Un ou plusieurs articles introuvables." });
    }
    const articleMap = Object.fromEntries(dbArticles.map((a) => [a.id, a]));

    // ── 3. Calcul du coût total ──────────────────────────────────────────────
    const coutTotal = lignes.reduce(
      (sum, l) => sum + l.prixUnitaire * l.qteCommandee,
      0,
    );

    // ── 4. Création en base (transaction) ────────────────────────────────────
    const appro = await prisma.appro.create({
      data: {
        coutTotal,
        status: "VERIFIE",
        lignes: {
          create: lignes.map((l) => ({
            articleId: l.articleId,
            articleNom: articleMap[l.articleId].nom,
            prixUnitaire: l.prixUnitaire,
            qteCommandee: l.qteCommandee,
            coutLigne: l.prixUnitaire * l.qteCommandee,
          })),
        },
      },
      include: { lignes: true },
    });

    res.status(201).json(appro);
  } catch (err) {
    console.error("Erreur création appro:", err);
    res.status(500).json({ error: "Erreur lors de la création de l'appro." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/appros/:id/valider
// Valide un ordre d'appro (status VERIFIE → VALIDE) :
//   - Incrémente quantitéStock de chaque article
//   - Enregistre dateValidation
// Le coutTotal reste dans Appro comme trace comptable permanente.
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id/valider",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalide." });
    }

    try {
      // ── Transaction atomique : status + stock ────────────────────────────────
      // updateMany avec WHERE status=VERIFIE garantit qu'une seule requête
      // concurrente peut passer, éliminant la race condition.
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.appro.updateMany({
          where: { id, status: "VERIFIE" },
          data: { status: "VALIDE", dateValidation: new Date() },
        });

        if (result.count === 0) {
          const existing = await tx.appro.findUnique({ where: { id } });
          if (!existing) {
            const err = new Error("not_found");
            err.httpStatus = 404;
            err.clientError = "Appro introuvable.";
            throw err;
          }
          const err = new Error("already_valide");
          err.httpStatus = 409;
          err.clientError = "Cette appro a déjà été validée.";
          throw err;
        }

        // Incrémenter le stock de chaque article
        const appro = await tx.appro.findUnique({
          where: { id },
          include: { lignes: true },
        });
        for (const ligne of appro.lignes) {
          await tx.article.update({
            where: { id: ligne.articleId },
            data: {
              ["quantitéStock"]: { increment: ligne.qteCommandee },
            },
          });
        }
        return appro;
      });

      res.json(updated);
    } catch (err) {
      if (err.httpStatus) {
        return res.status(err.httpStatus).json({ error: err.clientError });
      }
      console.error("Erreur validation appro:", err);
      res
        .status(500)
        .json({ error: "Erreur lors de la validation de l'appro." });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/appros
// Historique de tous les ordres d'appro (admin).
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const appros = await prisma.appro.findMany({
      orderBy: { date: "desc" },
      include: { lignes: true },
    });
    res.json(appros);
  } catch (err) {
    console.error("Erreur liste appros:", err);
    res.status(500).json({ error: "Erreur lors du chargement des appros." });
  }
});

module.exports = router;
