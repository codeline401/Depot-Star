const express = require("express"); // Import the Express framework
const cors = require("cors"); // Import the CORS middleware

require("dotenv").config(); // Load environment variables from a .env file

const app = express(); // Create an instance of the Express application

app.use(cors({ origin: "http://localhost:5173" })); // Enable CORS for requests from the specified origin
app.use(express.json()); // Middleware to parse JSON request bodies

// ROUTES
app.use("/api/articles", require("./routes/articleRoutes")); // Use the articles routes for requests to /api/articles
app.use("/api/fournisseurs", require("./routes/fournisseurs")); // Use the fournisseurs routes for requests to /api/fournisseurs
app.use("/api/users", require("./routes/users")); // Use the users routes for requests to /api/users

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
