const router = require("express").Router();
const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// POST inscription d'un nouvel utilisateur
router.post("/register", async (req, res) => {
  try {
    const { nom, prenom, alias, mdp } = req.body;

    if (!nom || !prenom || !alias || !mdp) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const hashmdp = await bcrypt.hash(mdp, 10);
    const user = await prisma.user.create({
      data: { nom, prenom, alias, mdp: hashmdp },
    });
    const { mdp: _, ...userSafe } = user;
    res.status(201).json(userSafe);
  } catch (error) {
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
