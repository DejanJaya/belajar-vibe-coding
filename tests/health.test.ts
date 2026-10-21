import { beforeEach, describe, expect, it } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { sessions, users } from "../src/db/schema";

describe("Root & Health Check Endpoints", () => {
  beforeEach(async () => {
    await db.delete(sessions);
    await db.delete(users);
  });

  describe("GET /", () => {
    it("should return application information and greeting", async () => {
      const res = await app.handle(
        new Request("http://localhost:3000/", {
          method: "GET",
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, any>;
      expect(body).toEqual({
        name: "Belajar Vibe Coding API",
        version: "1.0.0",
        message: "Server is up and running with ElysiaJS, Bun, Drizzle ORM, and MySQL!",
      });
    });
  });

  describe("GET /health", () => {
    it("should return ok status and connected database status", async () => {
      const res = await app.handle(
        new Request("http://localhost:3000/health", {
          method: "GET",
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, any>;
      expect(body.status).toBe("ok");
      expect(body.database).toBe("connected");
      expect(typeof body.uptime).toBe("number");
      expect(typeof body.timestamp).toBe("string");
    });
  });

  describe("GET /swagger & /swagger/json", () => {
    it("should serve the Swagger UI page at /swagger", async () => {
      const res = await app.handle(
        new Request("http://localhost:3000/swagger", {
          method: "GET",
        })
      );

      expect(res.status).toBe(200);
    });

    it("should return valid OpenAPI JSON specification at /swagger/json", async () => {
      const res = await app.handle(
        new Request("http://localhost:3000/swagger/json", {
          method: "GET",
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, any>;
      expect(body.openapi).toBeDefined();
      expect(body.info?.title).toBe("Belajar Vibe Coding API");
      expect(
        body.paths?.["/api/users/"] || body.paths?.["/api/users"]
      ).toBeDefined();
      expect(body.paths?.["/api/users/login"]).toBeDefined();
      expect(body.paths?.["/api/users/current"]).toBeDefined();
      expect(body.paths?.["/api/users/logout"]).toBeDefined();
    });
  });
});
