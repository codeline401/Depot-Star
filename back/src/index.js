const express = require("express"); // Import the Express framework
const cors = require("cors"); // Import the CORS middleware

require("dotenv").config(); // Load environment variables from a .env file

const app = express(); // Create an instance of the Express application

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"]
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({ origin: allowedOrigins })); // Enable CORS for requests from the specified origin
app.use(express.json()); // Middleware to parse JSON request bodies

// ROUTES
app.use("/api/articles", require("./routes/articleRoutes"));
app.use("/api/fournisseurs", require("./routes/fournisseurRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/ventes", require("./routes/venteRoutes"));
app.use("/api/clients", require("./routes/clientRoutes"));
app.use("/api/emballages", require("./routes/emballageRoutes"));
app.use("/api/appros", require("./routes/approRoutes"));
app.use("/api/mouvements", require("./routes/mouvementRoutes"));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} already in use. Kill the other process first.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});
