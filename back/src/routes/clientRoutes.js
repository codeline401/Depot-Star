const router = require("express").Router();
const prisma = require("../prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// GET tous les clients (auth)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const clients = await prisma.client.findMany({ orderBy: { nom: "asc" } });
    res.json(clients);
  } catch (error) {
    console.error("Erreur chargement clients:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des clients." });
  }
});

// GET un client par ID avec ses ventes (auth)
router.get("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "id invalide." });
  }
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: { ventes: { orderBy: { date: "desc" }, include: { lignes: true } } },
    });
    if (!client) return res.status(404).json({ error: "Client introuvable." });
    res.json(client);
  } catch (error) {
    console.error("Erreur chargement client:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du client." });
  }
});

// POST créer un client (auth)
router.post("/", authMiddleware, async (req, res) => {
  const nomT = typeof req.body.nom === "string" ? req.body.nom.trim() : "";
  const adresseT = typeof req.body.adresse === "string" ? req.body.adresse.trim() : "";
  const telephoneT = typeof req.body.telephone === "string" ? req.body.telephone.trim() : "";
  if (!nomT || !adresseT || !telephoneT) {
    return res.status(400).json({ error: "Nom, adresse et téléphone sont requis." });
  }
  try {
    const client = await prisma.client.create({
      data: { nom: nomT, adresse: adresseT, telephone: telephoneT },
    });
    res.status(201).json(client);
  } catch (error) {
    console.error("Erreur création client:", error);
    res.status(500).json({ error: "Erreur lors de la création du client." });
  }
});

// PUT modifier un client (auth)
router.put("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const nomT = typeof req.body.nom === "string" ? req.body.nom.trim() : "";
  const adresseT = typeof req.body.adresse === "string" ? req.body.adresse.trim() : "";
  const telephoneT = typeof req.body.telephone === "string" ? req.body.telephone.trim() : "";
  if (!nomT || !adresseT || !telephoneT) {
    return res.status(400).json({ error: "Nom, adresse et téléphone sont requis." });
  }
  try {
    const client = await prisma.client.update({
      where: { id },
      data: { nom: nomT, adresse: adresseT, telephone: telephoneT },
    });
    res.json(client);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Client introuvable." });
    console.error("Erreur mise à jour client:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du client." });
  }
});

// DELETE supprimer un client (admin)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await prisma.client.delete({ where: { id } });
    res.json({ message: "Client supprimé." });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Client introuvable." });
    console.error("Erreur suppression client:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du client." });
  }
});

module.exports = router;
