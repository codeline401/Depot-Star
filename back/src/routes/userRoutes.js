const router = require("express").Router();
const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// POST créer un user - admin seuelement (alias + mpd temporaire)
router.post("/register", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { nom, prenom, alias, mdp, role } = req.body; // role optionnel, par défaut SELLER

    if (!nom || !prenom || !alias || !mdp) {
      // Vérifie que l'alias et le mot de passe sont fournis
      return res
        .status(400)
        .json({ error: "nom, prenom, alias et mdp sont requis." });
    }

    const hashmdp = await bcrypt.hash(mdp, 10); // Hache le mot de passe avec bcrypt (10 rounds de salage)
    const user = await prisma.user.create({
      // Crée un nouvel utilisateur dans la base de données avec Prisma
      data: {
        nom,
        prenom,
        alias,
        mdp: hashmdp,
        role: role || "SELLER",
        mustChangePassword: true,
      },
    });
    const { mdp: _, ...userSafe } = user; // Exclut le champ mdp de l'objet user avant de le retourner
    res.status(201).json(userSafe);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Alias déjà utilisé." }); // Gère l'erreur de contrainte d'unicité de Prisma lorsque l'alias est déjà pris
    }
    console.error("Error registering user:", error);
    res
      .status(500)
      .json({ error: "An error occurred while registering the user." });
  }
});

// POST login
router.post("/login", async (req, res) => {
  try {
    const { alias, mdp } = req.body;
    const user = await prisma.user.findUnique({ where: { alias } });

    if (!user) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const isPasswordValid = await bcrypt.compare(mdp, user.mdp);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "8h",
    });

    const { mdp: _, ...userSafe } = user;
    res.json({ user: userSafe, token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: "An error occurred while logging in." });
  }
});

// POST changer le mdp (première connexin ou reset)
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { newMdp } = req.body;
    if (!newMdp || newMdp.length < 6) {
      return res.status(400).json({
        error: "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      });
    }

    const currentUser = await prisma.user.findUnique({
      // Récupère l'utilisateur actuel pour vérifier que le nouveau mot de passe est différent de l'ancien
      where: { id: res.user.id },
      select: { mdp: true },
    });
    if (!currentUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    const isSamePassword = await bcrypt.compare(newMdp, currentUser.mdp); // Vérifie que le nouveau mot de passe n'est pas le même que l'ancien
    if (isSamePassword) {
      return res.status(400).json({
        error: "Le nouveau mot de passe doit être différent de l'ancien.",
      });
    }

    const hash = await bcrypt.hash(newMdp, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { mdp: hash, mustChangePassword: false },
    });

    res.json({ message: "Mot de passe changé avec succès." });
  } catch (error) {
    console.error("Error changing password:", error);
    res
      .status(500)
      .json({ error: "An error occurred while changing the password." });
  }
});

// GET tous les users (sans mot de passe) — admin seulement
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, nom: true, prenom: true, alias: true, role: true },
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "An error occurred while fetching users." });
  }
});

module.exports = router;
