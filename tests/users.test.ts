import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { app } from "../src";
import { db } from "../src/db";
import { sessions, users } from "../src/db/schema";

const cleanupDatabase = async () => {
  await db.delete(sessions);
  await db.delete(users);
};

describe("POST /api/users (User Registration)", () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  it("should successfully register a new user and hash the password with bcrypt", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko Kurniawan",
          email: "eko@localhost",
          password: "rahasia123",
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({ data: "OK" });

    const [savedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "eko@localhost"));

    expect(savedUser).toBeDefined();
    expect(savedUser.name).toBe("Eko Kurniawan");
    expect(savedUser.email).toBe("eko@localhost");
    expect(savedUser.password).not.toBe("rahasia123");

    const isPasswordValid = await Bun.password.verify(
      "rahasia123",
      savedUser.password
    );
    expect(isPasswordValid).toBe(true);
  });

  it("should fail when registering with an already registered email", async () => {
    // Pertama: daftar user
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
          email: "eko@localhost",
          password: "rahasia",
        }),
      })
    );

    // Kedua: daftar lagi dengan email yang sama
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko Duplikat",
          email: "eko@localhost",
          password: "passwordbaru",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({ error: "Email sudah terdaftar" });
  });

  it("should fail when name is empty", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          email: "eko@localhost",
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBeDefined();
  });

  it("should fail when email is empty", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
          email: "",
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBeDefined();
  });

  it("should fail when password is empty", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
          email: "eko@localhost",
          password: "",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBeDefined();
  });

  it("should fail when name exceeds 255 characters", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "A".repeat(300),
          email: "eko@localhost",
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("Data too long for column");
  });

  it("should fail when email exceeds 255 characters", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
          email: `${"a".repeat(250)}@localhost.com`,
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBeDefined();
  });

  it("should fail when password exceeds 255 characters", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
          email: "eko@localhost",
          password: "P".repeat(300),
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBeDefined();
  });

  it("should fail when required fields are missing", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBeDefined();
  });
});

describe("POST /api/users/login (User Login)", () => {
  beforeEach(async () => {
    await cleanupDatabase();

    // Seed 1 registered user before each login test
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
          email: "eko@localhost",
          password: "rahasia",
        }),
      })
    );
  });

  it("should successfully login and store UUID token in sessions table", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "eko@localhost",
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.data).toBeDefined();
    expect(typeof body.data).toBe("string");
    expect(body.data).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    const [savedSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, body.data));

    expect(savedSession).toBeDefined();
    expect(savedSession.token).toBe(body.data);
  });

  it("should fail when email is not registered", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "tidakada@localhost",
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({ error: "Email atau password salah" });
  });

  it("should fail when password is wrong", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "eko@localhost",
          password: "passwordsalah",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({ error: "Email atau password salah" });
  });

  it("should fail when email or password is empty", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "",
          password: "",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBeDefined();
  });

  it("should fail when email or password exceeds 255 characters", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "eko@localhost",
          password: "X".repeat(300),
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBeDefined();
  });

  it("should fail when login fields are missing", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "eko@localhost",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBeDefined();
  });
});

describe("GET /api/users/current (Get Current User)", () => {
  let activeToken = "";

  beforeEach(async () => {
    await cleanupDatabase();

    // Register & login user before each test
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
          email: "eko@localhost",
          password: "rahasia",
        }),
      })
    );

    const loginRes = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "eko@localhost",
          password: "rahasia",
        }),
      })
    );
    const loginBody = (await loginRes.json()) as Record<string, any>;
    activeToken = loginBody.data;
  });

  it("should successfully get current logged-in user profile without password", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.data).toBeDefined();
    expect(typeof body.data.id).toBe("number");
    expect(body.data.name).toBe("Eko");
    expect(body.data.email).toBe("eko@localhost");
    expect(body.data.created_at).toBeDefined();
    expect(body.data.password).toBeUndefined();
  });

  it("should fail when Authorization header is not provided", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("should fail when Authorization header does not use Bearer prefix", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: activeToken,
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("should fail when Bearer token is empty", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: "Bearer    ",
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("should fail when Bearer token is invalid or not found in database", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: "Bearer 00000000-0000-0000-0000-000000000000",
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({ error: "Unauthorized" });
  });
});

describe("DELETE /api/users/logout (User Logout)", () => {
  let activeToken = "";

  beforeEach(async () => {
    await cleanupDatabase();

    // Register & login user before each test
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Eko",
          email: "eko@localhost",
          password: "rahasia",
        }),
      })
    );

    const loginRes = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "eko@localhost",
          password: "rahasia",
        }),
      })
    );
    const loginBody = (await loginRes.json()) as Record<string, any>;
    activeToken = loginBody.data;
  });

  it("should successfully logout user and remove session from database", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({ data: "OK" });

    const [deletedSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, activeToken));

    expect(deletedSession).toBeUndefined();
  });

  it("should reject subsequent requests using a token that has already logged out", async () => {
    // 1. Logout pertama sukses
    const firstLogout = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      })
    );
    expect(firstLogout.status).toBe(200);

    // 2. Coba akses GET /api/users/current dengan token yang sudah logout
    const currentRes = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      })
    );
    expect(currentRes.status).toBe(401);
    expect(await currentRes.json()).toEqual({ error: "Unauthorized" });

    // 3. Coba akses DELETE /api/users/logout lagi dengan token yang sama
    const secondLogout = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      })
    );
    expect(secondLogout.status).toBe(401);
    expect(await secondLogout.json()).toEqual({ error: "Unauthorized" });
  });

  it("should fail when Authorization header is missing or malformed", async () => {
    const resMissing = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
      })
    );
    expect(resMissing.status).toBe(401);
    expect(await resMissing.json()).toEqual({ error: "Unauthorized" });

    const resMalformed = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer   ",
        },
      })
    );
    expect(resMalformed.status).toBe(401);
    expect(await resMalformed.json()).toEqual({ error: "Unauthorized" });
  });

  it("should fail when token is invalid or non-existent", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer 00000000-0000-0000-0000-000000000000",
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({ error: "Unauthorized" });
  });
});
