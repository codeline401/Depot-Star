const router = require("express").Router();
const prisma = require("../prisma"); // Import the Prisma Client instance
const bdrypt = require("bcrypt"); // Import the bcrypt library for password hashing
const jwt = require("jsonwebtoken"); // Import the jsonwebtoken library for token generation

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret"; // Secret key for JWT, should be set in environment variables

// POST inscription d'un nouvel utilisateur
export const createUser = router.post("/register", async (req, res) => {
  try {
    const { nom, prenom, alias, mdp, role } = req.body; // Extract user details from the request body

    const hashmdp = await bcrypt.hash(mdp, 10); // Hash the password with a salt round of 10
    const user = await prisma.user.create({
      data: {
        nom: nom,
        prenom: prenom,
        alias: alias,
        mdp: hashmdp,
        role: role,
      },
    });

    const { mdp: _, ...userSafe } = user; // Exclude the password from the user object

    res.status(201).json(userSafe); // Send the created user back in the response, excluding the password
  } catch (error) {
    console.error("Error registering user:", error);
    res
      .status(500)
      .json({ error: "An error occurred while registering the user." }); // Send a generic error message in case of failure
  }
});

export const loginUser = router.post("/login", async (req, res) => {
  try {
    const { alias, mdp } = req.body; // Extract alias and password from the request body
    const user = await prisma.user.findUnique({
      where: { alias: alias },
    });

    if (!user) {
      return res.status(400).json({ error: "Identifiant invalide" }); // Return an error if alias is not provided
    }

    const isPasswordValid = await bcrypt.compare(mdp, user.mdp); // Compare the provided password with the hashed password in the database
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Mot de passe invalide" }); // Return an error if the password is incorrect
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    }); // Generate a JWT token with user ID and role, expiring in 1 hour

    const { mdp: _, ...userSafe } = user; // Exclude the password from the user object
    res.status(200).json({ user: userSafe, token }); // Send the user data and token in the response
  } catch (error) {
    console.error("Error logging in user:", error);
    res
      .status(500)
      .json({ error: "An error occurred while logging in the user." }); // Send a generic error message in case of failure
  }
});
