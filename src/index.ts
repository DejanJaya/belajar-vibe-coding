import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { usersRoute } from "./routes/users-route";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Belajar Vibe Coding API",
          version: "1.0.0",
          description:
            "Dokumentasi RESTful API untuk manajemen pengguna dan autentikasi berbasis session token.",
        },
        tags: [
          {
            name: "General",
            description: "Endpoint informasi umum dan pemeriksaan kesehatan server (Health Check)",
          },
          {
            name: "Users",
            description: "Endpoint registrasi, login, profil pengguna, dan logout",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              description: "Masukkan session token UUID yang diperoleh dari endpoint POST /api/users/login",
            },
          },
        },
      },
    })
  )
  .get(
    "/",
    () => ({
      name: "Belajar Vibe Coding API",
      version: "1.0.0",
      message: "Server is up and running with ElysiaJS, Bun, Drizzle ORM, and MySQL!",
    }),
    {
      detail: {
        tags: ["General"],
        summary: "Root Endpoint",
        description: "Mengembalikan informasi nama, versi, dan status dasar aplikasi.",
      },
    }
  )
  .get(
    "/health",
    async ({ set }) => {
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
    },
    {
      detail: {
        tags: ["General"],
        summary: "Health Check",
        description: "Memeriksa uptime server dan memastikan koneksi ke database MySQL berjalan normal.",
      },
    }
  )
  .use(usersRoute)
  .listen(port);

console.log(`🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
