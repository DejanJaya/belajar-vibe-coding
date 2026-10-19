import { Elysia, t } from "elysia";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export const userRoutes = new Elysia({ prefix: "/users" })
  .get("/", async () => {
    return await db.select().from(users);
  })
  .get(
    "/:id",
    async ({ params: { id }, set }) => {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, Number(id)));

      if (!result.length) {
        set.status = 404;
        return { message: "User not found" };
      }

      return result[0];
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const [result] = await db.insert(users).values({
          name: body.name,
          email: body.email,
        });

        set.status = 201;
        return {
          message: "User created successfully",
          id: result.insertId,
        };
      } catch (err: any) {
        set.status = 400;
        return { message: err.message || "Failed to create user" };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: "email" }),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ params: { id } }) => {
      await db.delete(users).where(eq(users.id, Number(id)));
      return { message: "User deleted successfully" };
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    }
  );
