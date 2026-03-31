const router = require("express").Router();
const prisma = require("../prisma");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

function parsePositiveIntId(raw) {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET tous les clients (auth)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const clients = await prisma.client.findMany({ orderBy: { nom: "asc" } });
    res.json(clients);
  } catch (error) {
    console.error("Erreur chargement clients:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des clients." });
  }
});

// GET un client par ID avec ses ventes (auth)
router.get("/:id", authMiddleware, async (req, res) => {
  const id = parsePositiveIntId(req.params.id); // Convertit l'ID du client depuis les paramètres de la requête en entier positif
  if (id === null) {
    // Valide que l'ID est un entier positif
    return res.status(400).json({ error: "id invalide." }); // Retourne une erreur 400 Bad Request si l'ID est invalide
  }
  try {
    const client = await prisma.client.findUnique({
      // Recherche du client dans la base de données par son ID
      where: { id },
      include: {
        ventes: { orderBy: { date: "desc" }, include: { lignes: true } },
      },
    });
    if (!client) return res.status(404).json({ error: "Client introuvable." });
    res.json(client);
  } catch (error) {
    console.error("Erreur chargement client:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération du client." });
  }
});

// POST créer un client (auth + seller)
router.post("/", authMiddleware, async (req, res) => {
  const nomT = typeof req.body.nom === "string" ? req.body.nom.trim() : "";
  const adresseT =
    typeof req.body.adresse === "string" ? req.body.adresse.trim() : "";
  const telephoneT =
    typeof req.body.telephone === "string" ? req.body.telephone.trim() : "";
  if (!nomT || !adresseT || !telephoneT) {
    return res
      .status(400)
      .json({ error: "Nom, adresse et téléphone sont requis." });
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
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = parsePositiveIntId(req.params.id); // Convertit l'ID du client depuis les paramètres de la requête en entier positif
  if (id === null) {
    // Valide que l'ID est un entier positif
    return res.status(400).json({ error: "id invalide." }); // Retourne une erreur 400 Bad Request si l'ID est invalide
  }

  const nomT = typeof req.body.nom === "string" ? req.body.nom.trim() : ""; // Valide et nettoie le nom du client depuis le corps de la requête
  const adresseT =
    typeof req.body.adresse === "string" ? req.body.adresse.trim() : ""; // Valide et nettoie l'adresse du client depuis le corps de la requête
  const telephoneT =
    typeof req.body.telephone === "string" ? req.body.telephone.trim() : ""; // Valide et nettoie le téléphone du client depuis le corps de la requête

  if (!nomT || !adresseT || !telephoneT) {
    // Vérifie que le nom, l'adresse et le téléphone sont tous présents et valides
    return res
      .status(400)
      .json({ error: "Nom, adresse et téléphone sont requis." });
  }
  try {
    const client = await prisma.client.update({
      // Met à jour le client dans la base de données avec les nouvelles données
      where: { id }, // Spécifie le client à mettre à jour par son ID
      data: { nom: nomT, adresse: adresseT, telephone: telephoneT }, // Les nouvelles données du client à mettre à jour
    });
    res.json(client);
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ error: "Client introuvable." });
    console.error("Erreur mise à jour client:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du client." });
  }
});

// DELETE supprimer un client (admin)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = parsePositiveIntId(req.params.id); // Convertit l'ID du client depuis les paramètres de la requête en entier positif

  if (id === null) {
    return res.status(400).json({ error: "id invalide." });
  }

  try {
    await prisma.client.delete({ where: { id } });
    res.json({ message: "Client supprimé." });
  } catch (error) {
    if (error.code === "P2003") {
      // Code d'erreur Prisma indiquant une violation de contrainte de clé étrangère, ce qui signifie que le client est lié à des ventes
      return res.status(409).json({
        error: "Impossible de supprimer le client car des ventes y sont liées.",
      });
    }

    if (error.code === "P2025")
      // Code d'erreur Prisma indiquant que l'élément à supprimer n'existe pas, ce qui signifie que le client avec l'ID spécifié est introuvable
      return res.status(404).json({ error: "Client introuvable." });
    console.error("Erreur suppression client:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du client." });
  }
});

module.exports = router;
