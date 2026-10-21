import { Elysia, t } from "elysia";
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
      response: {
        200: t.Object(
          {
            name: t.String({
              default: "Belajar Vibe Coding API",
              description: "Nama aplikasi",
            }),
            version: t.String({
              default: "1.0.0",
              description: "Versi API",
            }),
            message: t.String({
              default: "Server is up and running with ElysiaJS, Bun, Drizzle ORM, and MySQL!",
              description: "Pesan status server",
            }),
          },
          { description: "Informasi dasar aplikasi" }
        ),
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
      response: {
        200: t.Object(
          {
            status: t.String({
              default: "ok",
              description: "Status kesehatan server",
            }),
            uptime: t.Number({
              default: 42.15,
              description: "Waktu aktif server dalam detik",
            }),
            database: t.String({
              default: "connected",
              description: "Status koneksi database MySQL",
            }),
            timestamp: t.String({
              default: "2026-10-21T05:00:00.000Z",
              description: "Waktu pengecekan (ISO timestamp)",
            }),
          },
          { description: "Server dan koneksi database MySQL berjalan normal" }
        ),
        503: t.Object(
          {
            status: t.String({
              default: "error",
              description: "Status error server",
            }),
            uptime: t.Number({
              default: 42.15,
              description: "Waktu aktif server dalam detik",
            }),
            database: t.String({
              default: "disconnected",
              description: "Status koneksi database MySQL",
            }),
            error: t.String({
              default: "Database connection failed",
              description: "Pesan error kegagalan koneksi",
            }),
            timestamp: t.String({
              default: "2026-10-21T05:00:00.000Z",
              description: "Waktu pengecekan (ISO timestamp)",
            }),
          },
          { description: "Koneksi ke database terputus atau gagal" }
        ),
      },
    }
  )
  .use(usersRoute)
  .listen(port);

console.log(`🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
