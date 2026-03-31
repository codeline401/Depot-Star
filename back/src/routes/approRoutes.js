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
        typeof l.articleNom !== "string" ||
        !l.articleNom.trim() ||
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

    // ── 2. Calcul du coût total ──────────────────────────────────────────────
    const coutTotal = lignes.reduce(
      (sum, l) => sum + l.prixUnitaire * l.qteCommandee,
      0,
    );

    // ── 3. Création en base (transaction) ────────────────────────────────────
    const appro = await prisma.appro.create({
      data: {
        coutTotal,
        status: "VERIFIE",
        lignes: {
          create: lignes.map((l) => ({
            articleId: l.articleId,
            articleNom: l.articleNom.trim(),
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
      // ── 1. Charger l'appro ───────────────────────────────────────────────────
      const appro = await prisma.appro.findUnique({
        where: { id },
        include: { lignes: true },
      });

      if (!appro) {
        return res.status(404).json({ error: "Appro introuvable." });
      }
      if (appro.status === "VALIDE") {
        return res
          .status(409)
          .json({ error: "Cette appro a déjà été validée." });
      }

      // ── 2. Transaction : stock + status ─────────────────────────────────────
      const updated = await prisma.$transaction(async (tx) => {
        // Incrémenter le stock de chaque article
        for (const ligne of appro.lignes) {
          await tx.article.update({
            where: { id: ligne.articleId },
            data: {
              ["quantitéStock"]: { increment: ligne.qteCommandee },
            },
          });
        }

        // Passer l'appro en VALIDE
        return tx.appro.update({
          where: { id },
          data: {
            status: "VALIDE",
            dateValidation: new Date(),
          },
          include: { lignes: true },
        });
      });

      res.json(updated);
    } catch (err) {
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
