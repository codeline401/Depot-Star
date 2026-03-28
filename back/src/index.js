const express = require("express"); // Import the Express framework
const cors = require("cors"); // Import the CORS middleware

require("dotenv").config(); // Load environment variables from a .env file

const app = express(); // Create an instance of the Express application

app.use(cors({ origin: "http://localhost:5173" })); // Enable CORS for requests from the specified origin
app.use(express.json()); // Middleware to parse JSON request bodies

// ROUTES
app.use("/api/articles", require("./routes/articleRoutes"));
app.use("/api/fournisseurs", require("./routes/fournisseurRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/ventes", require("./routes/venteRoutes"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
