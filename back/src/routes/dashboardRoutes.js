const router = require("express").Router();
const prisma = require("../prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// GET /api/dashboard/stats — admin seulement
router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Chargement parallèle
    const [ventes, articles, nbClients, approsValides] = await Promise.all([
      prisma.vente.findMany({
        include: { client: true, lignes: true },
        orderBy: { date: "asc" },
      }),
      prisma.article.findMany({
        select: {
          id: true,
          nom: true,
          ["quantitéStock"]: true,
          bottleType: true,
          prix: true,
          prixConsigne: true,
          aConsigner: true,
        },
      }),
      prisma.client.count(),
      // Coûts des appros validées (déduction du CA)
      prisma.appro.findMany({
        where: { status: "VALIDE" },
        select: { coutTotal: true, dateValidation: true },
      }),
    ]);

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const caTotal = ventes.reduce((s, v) => s + v.total, 0);

    const ventesJour = ventes.filter((v) => new Date(v.date) >= startOfDay);
    const caJour = ventesJour.reduce((s, v) => s + v.total, 0);

    const ventesMois = ventes.filter((v) => new Date(v.date) >= startOfMonth);
    const caMois = ventesMois.reduce((s, v) => s + v.total, 0);

    // Coûts d'approvisionnement validés (déduits du CA pour le CA net)
    const coutApproTotal =
      Math.round(approsValides.reduce((s, a) => s + a.coutTotal, 0) * 100) /
      100;
    const coutApproMois =
      Math.round(
        approsValides
          .filter(
            (a) =>
              a.dateValidation && new Date(a.dateValidation) >= startOfMonth,
          )
          .reduce((s, a) => s + a.coutTotal, 0) * 100,
      ) / 100;
    // CA net = recettes ventes − coût des appros
    const caNetTotal = Math.round((caTotal - coutApproTotal) * 100) / 100;
    const caNetMois = Math.round((caMois - coutApproMois) * 100) / 100;

    const stockFaibleCount = articles.filter(
      (a) => a["quantitéStock"] <= 5,
    ).length;

    // ── Valeur du stock & des emballages ─────────────────────────────────────
    const valeurStock =
      Math.round(
        articles.reduce((s, a) => s + a.prix * a["quantitéStock"], 0) * 100,
      ) / 100;

    const valeurEmballages =
      Math.round(
        articles
          .filter((a) => a.aConsigner)
          .reduce((s, a) => s + a.prixConsigne * a["quantitéStock"], 0) * 100,
      ) / 100;

    // ── Courbe ventes (30 derniers jours) ────────────────────────────────────
    const ventesParJourMap = {};
    ventes
      .filter((v) => new Date(v.date) >= thirtyDaysAgo)
      .forEach((v) => {
        const d = new Date(v.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!ventesParJourMap[key])
          ventesParJourMap[key] = { date: key, ca: 0, nbVentes: 0 };
        ventesParJourMap[key].ca =
          Math.round((ventesParJourMap[key].ca + v.total) * 100) / 100;
        ventesParJourMap[key].nbVentes += 1;
      });

    const ventesParJour = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      ventesParJour.push(
        ventesParJourMap[key] || { date: key, ca: 0, nbVentes: 0 },
      );
    }

    // ── Top vendeurs ─────────────────────────────────────────────────────────
    const vendeurMap = {};
    ventes.forEach((v) => {
      if (!vendeurMap[v.vendeur])
        vendeurMap[v.vendeur] = { vendeur: v.vendeur, ca: 0, nbVentes: 0 };
      vendeurMap[v.vendeur].ca =
        Math.round((vendeurMap[v.vendeur].ca + v.total) * 100) / 100;
      vendeurMap[v.vendeur].nbVentes += 1;
    });
    const topVendeurs = Object.values(vendeurMap).sort((a, b) => b.ca - a.ca);

    // ── Top articles vendus ───────────────────────────────────────────────────
    const articleMap = {};
    ventes.forEach((v) => {
      v.lignes.forEach((l) => {
        if (!articleMap[l.articleNom])
          articleMap[l.articleNom] = { nom: l.articleNom, quantite: 0, ca: 0 };
        articleMap[l.articleNom].quantite += l.quantite;
        articleMap[l.articleNom].ca =
          Math.round((articleMap[l.articleNom].ca + l.prixTotal) * 100) / 100;
      });
    });
    const topArticles = Object.values(articleMap)
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);

    // ── Stock faible (≤ 10 unités) ───────────────────────────────────────────
    const stockFaible = articles
      .filter((a) => a["quantitéStock"] <= 10)
      .sort((a, b) => a["quantitéStock"] - b["quantitéStock"])
      .slice(0, 10);

    // ── CA mois précédent & panier moyen ────────────────────────────────────
    const caMoisPrecedent = ventes
      .filter((v) => {
        const d = new Date(v.date);
        return d >= startOfPrevMonth && d <= endOfPrevMonth;
      })
      .reduce((s, v) => s + v.total, 0);

    const panierMoyen =
      ventes.length > 0 ? Math.round((caTotal / ventes.length) * 100) / 100 : 0;

    // ── Répartition bouteilles en stock ──────────────────────────────────────
    const repartitionBottle = [
      {
        type: "Plastique",
        count: articles.filter((a) => a.bottleType === "PLASTIQUE").length,
      },
      {
        type: "Verre",
        count: articles.filter((a) => a.bottleType === "VERRE").length,
      },
    ];

    // ── Top 5 clients ────────────────────────────────────────────────────────
    const clientMap = {};
    ventes.forEach((v) => {
      const nom = v.client?.nom || `Client #${v.clientId}`;
      if (!clientMap[v.clientId])
        clientMap[v.clientId] = { id: v.clientId, nom, ca: 0, nbVentes: 0 };
      clientMap[v.clientId].ca =
        Math.round((clientMap[v.clientId].ca + v.total) * 100) / 100;
      clientMap[v.clientId].nbVentes += 1;
    });
    const topClients = Object.values(clientMap)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 5);

    // ── Coût appros par jour sur 30 jours (pour superposition avec CA) ───────
    const approsParJourMap = {};
    approsValides
      .filter(
        (a) => a.dateValidation && new Date(a.dateValidation) >= thirtyDaysAgo,
      )
      .forEach((a) => {
        const d = new Date(a.dateValidation);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!approsParJourMap[key])
          approsParJourMap[key] = { date: key, coutAppro: 0 };
        approsParJourMap[key].coutAppro =
          Math.round(
            (approsParJourMap[key].coutAppro + a.coutTotal) * 100,
          ) / 100;
      });

    const approsParJour = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      approsParJour.push(
        approsParJourMap[key] || { date: key, coutAppro: 0 },
      );
    }

    // ── CA par vendeur sur 7 jours (stacked chart) ───────────────────────────
    const vendeurs7j = [
      ...new Set(
        ventes
          .filter((v) => new Date(v.date) >= sevenDaysAgo)
          .map((v) => v.vendeur),
      ),
    ];
    const pivot7j = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      pivot7j[key] = { date: key };
    }
    ventes
      .filter((v) => new Date(v.date) >= sevenDaysAgo)
      .forEach((v) => {
        const d = new Date(v.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (pivot7j[key]) {
          pivot7j[key][v.vendeur] =
            Math.round(((pivot7j[key][v.vendeur] || 0) + v.total) * 100) / 100;
        }
      });
    const caParVendeur7j = Object.values(pivot7j);

    res.json({
      kpis: {
        caTotal,
        caJour,
        caMois,
        caMoisPrecedent,
        panierMoyen,
        valeurStock,
        valeurEmballages,
        nbVentes: ventes.length,
        nbVentesJour: ventesJour.length,
        nbClients,
        nbArticles: articles.length,
        stockFaibleCount,
        // Appro
        coutApproTotal,
        coutApproMois,
        caNetTotal,
        caNetMois,
      },
      ventesParJour,
      approsParJour,
      topVendeurs,
      topArticles,
      stockFaible,
      topClients,
      repartitionBottle,
      caParVendeur7j,
      vendeurs7j,
    });
  } catch (error) {
    console.error("Erreur dashboard:", error);
    res.status(500).json({ error: "Erreur lors du chargement du dashboard." });
  }
});

module.exports = router;
