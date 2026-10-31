const app = require("./app");
const env = require("./config/env");
const prisma = require("./config/prisma");

let server;
let shuttingDown = false;

async function startServer() {
  try {
    await prisma.$connect();

    console.log("PostgreSQL connection established.");

    server = app.listen(env.PORT, () => {
      console.log(
        `SunPower Solutions API running at http://localhost:${env.PORT}`
      );

      console.log(
        `Health check: http://localhost:${env.PORT}/health`
      );

      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error.message);

    await prisma.$disconnect().catch(() => {});

    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      try {
        await prisma.$disconnect();
        console.log("Database disconnected.");
        process.exitCode = 0;
      } catch (error) {
        console.error("Error disconnecting Prisma:", error.message);
        process.exitCode = 1;
      }
    });

    // Avoid hanging indefinitely on open connections.
    setTimeout(() => {
      console.error("Graceful shutdown timed out.");
      process.exit(1);
    }, 10000).unref();
  } else {
    await prisma.$disconnect().catch(() => {});
    process.exitCode = 0;
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();