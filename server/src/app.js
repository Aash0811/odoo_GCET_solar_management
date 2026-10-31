const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const prisma = require("./config/prisma");
const errorHandler = require("./middleware/errorHandler");

const app = express();

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const allowedOrigins = env.CLIENT_URL.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      // Requests from Postman and server-to-server clients
      // may not include an Origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin not allowed by CORS");
      error.statusCode = 403;

      return callback(error);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

// Basic API information.
app.get("/api/v1", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SunPower Solutions Solar Management API",
    version: "1.0.0"
  });
});

// Mount modules
app.use("/api/v1/auth", require("./modules/auth/routes"));
app.use("/api/v1/leads", require("./modules/leads/routes"));
app.use("/api/v1/surveys", require("./modules/surveys/routes"));
app.use("/api/v1/inventory", require("./modules/inventory/routes"));
app.use("/api/v1/quotes", require("./modules/quotes/routes"));
app.use("/api/v1/orders", require("./modules/orders/routes"));
app.use("/api/v1/dispatch", require("./modules/dispatch/routes"));
app.use("/api/v1/jobs", require("./modules/jobs/routes"));
app.use("/api/v1/warranty", require("./modules/warranty/routes"));
app.use("/api/v1/tickets", require("./modules/tickets/routes"));
app.use("/api/v1/finance", require("./modules/finance/routes"));
app.use("/api/v1/dashboard", require("./modules/dashboard/routes"));
app.use("/api/v1/customer-portal", require("./modules/customerPortal/routes"));
app.use("/api/v1/company", require("./modules/company/routes"));

// Health endpoint: checks both the API process and PostgreSQL.
app.get("/health", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      status: "healthy",
      service: "solar-installation-management-api",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    error.statusCode = 503;
    error.publicMessage =
      "The API is running, but the database is unavailable.";

    return next(error);
  }
});

// Unknown endpoints.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Error handling must be registered after routes.
app.use(errorHandler);

module.exports = app;