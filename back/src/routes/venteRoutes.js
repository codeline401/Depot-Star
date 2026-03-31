const router = require("express").Router();
const prisma = require("../prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// ─── Constantes emballage ───────────────────────────────────────────────────────
const CAGEOT_CONSIGNE = 8000; // Prix de consigne d'un cageot (Ar)
// Mapping prixConsigne bouteille → capacité du cageot correspondant
const BOTTLE_TO_CAGEOT = { 300: 24, 500: 20, 700: 12 };

// GET toutes les ventes (admin uniquement)
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const ventes = await prisma.vente.findMany({
      include: {
        client: true,
        lignes: true,
        consignesRetour: true,
        cageotsRetour: true,
      },
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

// ─── GET /:id ─ Détail d'une vente (tout utilisateur connecté) ──────────────────
router.get("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "id invalide." });
  }
  try {
    const vente = await prisma.vente.findUnique({
      where: { id }, // Recherche de la vente par son ID
      include: {
        client: true,
        lignes: true,
        cageotsRetour: true,
        consignesRetour: true,
      },
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

// ─── POST / ─ Créer une vente ─────────────────────────────────────────────────
// Corps attendu :
//   clientId         : Int
//   lignes           : [{ articleId, quantite }]
//   consignesRendues : [{ articleId, quantite }]  — bouteilles rendues (déduction)
//   cageotsRendus    : [{ capacite, quantite }]   — cageots rendus (déduction)
//   cageotsCommandes : [{ capacite, quantite }]   — cageots pris par le client (à consigner)
//
// Règle cageots :
//   Le vendeur demande au client si des cageots sont nécessaires pour cette vente.
//   Si oui → combien → ces quantités sont consignées et déduites du stock.
//   Si cageotsCommandes est vide → aucun cageot consigné, section retour masquée.
router.post("/", authMiddleware, async (req, res) => {
  const {
    clientId,
    lignes,
    consignesRendues = [], // bouteilles rendues par le client → déduction consigne
    cageotsRendus = [], // cageots rendus par le client → déduction consigne
    cageotsCommandes = [], // cageots pris par le client → à consigner
  } = req.body;

  // ── Validations entrée ──────────────────────────────────────────────────────
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
  if (!Array.isArray(consignesRendues)) {
    return res
      .status(400)
      .json({ error: "consignesRendues doit être un tableau." });
  }
  for (const r of consignesRendues) {
    const rId = parseInt(r.articleId, 10);
    const rQty = parseInt(r.quantite, 10);
    if (
      !Number.isInteger(rId) ||
      rId <= 0 ||
      !Number.isInteger(rQty) ||
      rQty <= 0
    ) {
      return res.status(400).json({
        error:
          "Chaque retour de consigne doit avoir un articleId et une quantite valides.",
      });
    }
  }

  if (!Array.isArray(cageotsRendus)) {
    return res
      .status(400)
      .json({ error: "cageotsRendus doit être un tableau." });
  }
  for (const r of cageotsRendus) {
    const cap = parseInt(r.capacite, 10);
    const qty = parseInt(r.quantite, 10);
    if (![12, 20, 24].includes(cap) || isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        error:
          "Chaque retour cageot doit avoir une capacite (12/20/24) et une quantite > 0.",
      });
    }
  }

  // Validation cageotsCommandes : cageots pris par le client pour cette vente
  if (!Array.isArray(cageotsCommandes)) {
    return res
      .status(400)
      .json({ error: "cageotsCommandes doit être un tableau." });
  }
  for (const c of cageotsCommandes) {
    const cap = parseInt(c.capacite, 10);
    const qty = parseInt(c.quantite, 10);
    if (![12, 20, 24].includes(cap) || isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        error:
          "Chaque cageot commandé doit avoir une capacite (12/20/24) et une quantite > 0.",
      });
    }
  }

  try {
    // ── Client ──────────────────────────────────────────────────────────────
    const client = await prisma.client.findUnique({
      where: { id: parsedClientId },
    });
    if (!client) return res.status(404).json({ error: "Client introuvable." });

    // ── Agréger quantités par articleId ─────────────────────────────────────
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

    // ── Vérification stocks articles ─────────────────────────────────────────
    for (const article of articles) {
      if (article["quantitéStock"] < qtyMap[article.id]) {
        return res.status(400).json({
          error: `Stock insuffisant pour "${article.nom}". Disponible : ${article["quantitéStock"]}, Demandé : ${qtyMap[article.id]}`,
        });
      }
    }

    // ── Cageots commandés : map capacite → quantite ───────────────────────────
    // Fournis par le frontend après confirmation explicite du vendeur.
    // ("Des cageots sont-ils nécessaires ? Si oui, combien ?")
    // Si vide → aucune consigne cageot pour cette vente.
    const commandeMap = {}; // { capacite → quantite commandée }
    for (const c of cageotsCommandes) {
      commandeMap[parseInt(c.capacite)] = parseInt(c.quantite);
    }

    // ── Vérification stock cageots commandés ──────────────────────────────────
    const emballages = await prisma.emballage.findMany();
    for (const [capStr, qtyCommande] of Object.entries(commandeMap)) {
      const capacite = parseInt(capStr);
      const embCageot = emballages.find(
        (e) => e.type === "CAGEOT" && e.capacite === capacite,
      );
      if (embCageot && embCageot.quantiteStock < qtyCommande) {
        return res.status(400).json({
          error: `Stock cageots insuffisant (capacité ${capacite}). Disponible : ${embCageot.quantiteStock}, Commandé : ${qtyCommande}`,
        });
      }
    }

    // ── Distribution des cageots commandés par ligne d'article ───────────────
    // Algorithme marginal : on remplit un cageot avant d'en ouvrir un autre.
    // Chaque article reçoit les cageots qu'il "ouvre" dans son groupe de capacité.
    // Seuls les groupes de capacité présents dans commandeMap sont traités.
    // Si le vendeur commande plus que le minimum (ex : +1 cageot pour le client),
    // l'excédent est attribué au premier article du groupe.
    const articleCageotAlloc = {}; // { articleId: { qteCageots, consigneCageot } }
    const cumByCapacite = {}; // { capacite: cumul bouteilles du groupe }
    for (const article of articles) {
      const cap = BOTTLE_TO_CAGEOT[article.prixConsigne];
      // Uniquement les bouteilles VERRE consignées dont des cageots ont été commandés
      if (
        article.bottleType === "VERRE" &&
        article.aConsigner &&
        cap &&
        commandeMap[cap] > 0
      ) {
        const cumBefore = cumByCapacite[cap] || 0;
        const cumAfter = cumBefore + qtyMap[article.id];
        const qteCageots =
          Math.ceil(cumAfter / cap) - Math.ceil(cumBefore / cap);
        articleCageotAlloc[article.id] = {
          qteCageots,
          consigneCageot: qteCageots * CAGEOT_CONSIGNE,
        };
        cumByCapacite[cap] = cumAfter;
      }
    }
    // Gestion de l'excédent commandé au-delà du minimum calculé
    for (const [capStr, qtyCommande] of Object.entries(commandeMap)) {
      const cap = parseInt(capStr);
      let autoTotal = 0;
      let firstArtId = null;
      for (const article of articles) {
        if (
          article.bottleType === "VERRE" &&
          article.aConsigner &&
          BOTTLE_TO_CAGEOT[article.prixConsigne] === cap
        ) {
          if (firstArtId === null) firstArtId = article.id;
          autoTotal += articleCageotAlloc[article.id]?.qteCageots ?? 0;
        }
      }
      const extra = qtyCommande - autoTotal;
      if (extra > 0 && firstArtId !== null) {
        if (!articleCageotAlloc[firstArtId]) {
          articleCageotAlloc[firstArtId] = { qteCageots: 0, consigneCageot: 0 };
        }
        articleCageotAlloc[firstArtId].qteCageots += extra;
        articleCageotAlloc[firstArtId].consigneCageot +=
          extra * CAGEOT_CONSIGNE;
      }
    }

    // ── Consignes bouteilles rendues ────────────────────────────────────────
    let consigneRendue = 0;
    const consignesRetourData = [];
    if (consignesRendues.length > 0) {
      const retourIds = consignesRendues.map((r) => parseInt(r.articleId, 10));
      const retourArticles = await prisma.article.findMany({
        where: { id: { in: retourIds }, aConsigner: true },
      });
      const retourMap = Object.fromEntries(
        retourArticles.map((a) => [a.id, a]),
      );
      for (const r of consignesRendues) {
        const id = parseInt(r.articleId, 10);
        const qty = parseInt(r.quantite, 10);
        const article = retourMap[id];
        if (!article) {
          return res.status(400).json({
            error: `L'article #${id} n'est pas consignable ou n'existe pas.`,
          });
        }
        const montant = Math.round(article.prixConsigne * qty * 100) / 100;
        consigneRendue += montant;
        consignesRetourData.push({
          articleId: article.id,
          articleNom: article.nom,
          prixConsigne: article.prixConsigne,
          quantite: qty,
          montant,
        });
      }
    }

    // ── Consignes cageots rendus ─────────────────────────────────────────────
    let consigneCageotRendue = 0;
    const cageotsRetourData = [];
    for (const r of cageotsRendus) {
      const capacite = parseInt(r.capacite, 10);
      const qty = parseInt(r.quantite, 10);
      const montant = qty * CAGEOT_CONSIGNE;
      consigneCageotRendue += montant;
      cageotsRetourData.push({ capacite, quantite: qty, montant });
    }

    // ── Calcul lignes de vente ───────────────────────────────────────────────
    const venteLignesData = uniqueArticleIds.map((id) => {
      const article = articles.find((a) => a.id === id);
      const quantite = qtyMap[id];
      const prixConsigneUnitaire = article.aConsigner
        ? article.prixConsigne
        : 0;
      const { qteCageots = 0, consigneCageot: consigneCageotLigne = 0 } =
        articleCageotAlloc[id] || {};
      const prixTotal =
        (article.prix + prixConsigneUnitaire) * quantite + consigneCageotLigne;
      return {
        articleId: article.id,
        articleNom: article.nom,
        prixUnitaire: article.prix,
        prixConsigne: prixConsigneUnitaire,
        consigneCageot: consigneCageotLigne,
        qteCageots,
        quantite,
        prixTotal,
      };
    });

    const total = venteLignesData.reduce((sum, l) => sum + l.prixTotal, 0);
    const totalNet =
      Math.round((total - consigneRendue - consigneCageotRendue) * 100) / 100;

    // ── Transaction atomique ────────────────────────────────────────────────
    // Toutes les écritures en base sont groupées pour garantir la cohérence.
    const vente = await prisma.$transaction(
      async (tx) => {
        // Décrémenter le stock des articles vendus
        for (const id of uniqueArticleIds) {
          await tx.article.update({
            where: { id },
            data: { ["quantitéStock"]: { decrement: qtyMap[id] } },
          });
        }

        // Décrémenter le stock des cageots commandés par le client
        for (const [capStr, qtyCommande] of Object.entries(commandeMap)) {
          const capacite = parseInt(capStr, 10);
          const embCageot = emballages.find(
            (e) => e.type === "CAGEOT" && e.capacite === capacite,
          );
          if (embCageot) {
            await tx.emballage.update({
              where: { id: embCageot.id },
              data: { quantiteStock: { decrement: qtyCommande } },
            });
          }
        }

        // Bouteilles rendues → créer/incrémenter l'emballage BOUTEILLE vide correspondant
        // (upsert : crée l'Emballage BOUTEILLE s'il n'existe pas encore)
        for (const r of consignesRetourData) {
          const article = articles.find((a) => a.id === r.articleId);
          if (article) {
            await tx.emballage.upsert({
              where: {
                type_prixConsigne_capacite: {
                  type: "BOUTEILLE",
                  prixConsigne: article.prixConsigne,
                  capacite: 0,
                },
              },
              create: {
                type: "BOUTEILLE",
                prixConsigne: article.prixConsigne,
                capacite: 0,
                quantiteStock: r.quantite,
              },
              update: { quantiteStock: { increment: r.quantite } },
            });
          }
        }

        // Cageots rendus → réintégrer dans le stock Emballage CAGEOT
        for (const r of cageotsRetourData) {
          const embCageot = emballages.find(
            (e) => e.type === "CAGEOT" && e.capacite === r.capacite,
          );
          if (embCageot) {
            await tx.emballage.update({
              where: { id: embCageot.id },
              data: { quantiteStock: { increment: r.quantite } },
            });
          }
        }

        return tx.vente.create({
          data: {
            total: totalNet,
            consigneRendue,
            consigneCageotRendue,
            vendeur: req.user.alias ?? `user#${req.user.id}`,
            clientId: parsedClientId,
            lignes: { create: venteLignesData },
            ...(consignesRetourData.length > 0 && {
              consignesRetour: { create: consignesRetourData },
            }),
            ...(cageotsRetourData.length > 0 && {
              cageotsRetour: { create: cageotsRetourData },
            }),
          },
          include: { client: true, lignes: true, cageotsRetour: true },
        });
      },
      { timeout: 20000 },
    );

    // ── Réponse enrichie ────────────────────────────────────────────────────
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
          consigneCageot: l.consigneCageot,
          qteCageots: l.qteCageots,
          prixTotal: l.prixTotal,
        };
      }),
      consignesRetour: consignesRetourData,
      cageotsRetour: cageotsRetourData,
      consigneRendue,
      consigneCageotRendue,
      total: totalNet,
    });
  } catch (error) {
    console.error("Erreur traitement vente:", error);
    res.status(500).json({
      error: "Une erreur est survenue lors du traitement de la vente.",
    });
  }
});

module.exports = router;
