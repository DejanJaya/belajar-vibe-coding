import { Elysia, t } from "elysia";
import { getCurrentUser, loginUser, logoutUser, registerUser } from "../services/users-service";

const extractBearerToken = (headers: Record<string, string | undefined>): string | null => {
  const authorization = headers["authorization"];
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
};

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
  )
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const result = await loginUser(body);
        set.status = 200;
        return result;
      } catch (error: any) {
        set.status = 400;
        return {
          error: error.message || "Email atau password salah",
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ minLength: 1, error: "Email tidak boleh kosong" }),
        password: t.String({ minLength: 1, error: "Password tidak boleh kosong" }),
      }),
    }
  )
  .get(
    "/current",
    async ({ headers, set }) => {
      try {
        const token = extractBearerToken(headers);
        if (!token) {
          set.status = 401;
          return { error: "Unauthorized" };
        }

        const result = await getCurrentUser(token);
        set.status = 200;
        return result;
      } catch (error: any) {
        if (error.message === "Unauthorized") {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        set.status = 500;
        return { error: "Internal Server Error" };
      }
    }
  )
  .delete(
    "/logout",
    async ({ headers, set }) => {
      try {
        const token = extractBearerToken(headers);
        if (!token) {
          set.status = 401;
          return { error: "Unauthorized" };
        }

        const result = await logoutUser(token);
        set.status = 200;
        return result;
      } catch (error: any) {
        if (error.message === "Unauthorized") {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        set.status = 500;
        return { error: "Internal Server Error" };
      }
    }
  );
