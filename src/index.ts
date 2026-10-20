import { Elysia } from "elysia";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { usersRoute } from "./routes/users-route";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .get("/", () => ({
    name: "Belajar Vibe Coding API",
    version: "1.0.0",
    message: "Server is up and running with ElysiaJS, Bun, Drizzle ORM, and MySQL!",
  }))
  .get("/health", async ({ set }) => {
    try {
      // Test MySQL database connection
      await db.execute(sql`SELECT 1 as health`);
      return {
        status: "ok",
        uptime: process.uptime(),
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      set.status = 503;
      return {
        status: "error",
        uptime: process.uptime(),
        database: "disconnected",
        error: error.message || "Database connection failed",
        timestamp: new Date().toISOString(),
      };
    }
  })
  .use(usersRoute)
  .listen(port);

console.log(`🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
