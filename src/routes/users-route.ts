import { Elysia, t } from "elysia";
import { registerUser } from "../services/users-service";

export const usersRoute = new Elysia({ prefix: "/api/users" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return { error: error.message };
    }
  })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        await registerUser(body);
        set.status = 200;
        return { data: "OK" };
      } catch (error: any) {
        set.status = 400;
        return {
          error: error.message || "Gagal melakukan registrasi user",
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 1 }),
      }),
    }
  );
