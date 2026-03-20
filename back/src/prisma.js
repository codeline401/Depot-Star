const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient(); // Create a new instance of the Prisma Client

module.exports = prisma; // Export the Prisma Client instance for use in other parts of the application
