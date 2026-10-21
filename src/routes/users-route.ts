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
        name: t.String({
          minLength: 1,
          maxLength: 255,
          examples: ["Eko Kurniawan"],
          error: "Nama harus diisi dan maksimal 255 karakter",
        }),
        email: t.String({
          minLength: 1,
          maxLength: 255,
          examples: ["eko@localhost"],
          error: "Email harus diisi dan maksimal 255 karakter",
        }),
        password: t.String({
          minLength: 1,
          maxLength: 255,
          examples: ["rahasia123"],
          error: "Password harus diisi dan maksimal 255 karakter",
        }),
      }),
      detail: {
        tags: ["Users"],
        summary: "Registrasi Pengguna Baru",
        description:
          "Mendaftarkan akun pengguna baru dengan nama, email unik, dan password (di-hash dengan bcrypt).",
      },
      response: {
        200: t.Object(
          {
            data: t.String({
              default: "OK",
              examples: ["OK"],
              description: "Status registrasi berhasil",
            }),
          },
          { description: "Registrasi pengguna berhasil" }
        ),
        400: t.Object(
          {
            error: t.String({
              default: "Email sudah terdaftar",
              examples: ["Email sudah terdaftar"],
              description: "Pesan error validasi atau email duplikat",
            }),
          },
          { description: "Validasi gagal atau email sudah terdaftar" }
        ),
      },
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
        email: t.String({
          minLength: 1,
          maxLength: 255,
          examples: ["eko@localhost"],
          error: "Email harus diisi dan maksimal 255 karakter",
        }),
        password: t.String({
          minLength: 1,
          maxLength: 255,
          examples: ["rahasia123"],
          error: "Password harus diisi dan maksimal 255 karakter",
        }),
      }),
      detail: {
        tags: ["Users"],
        summary: "Login Pengguna",
        description:
          "Mengautentikasi pengguna dengan email dan password untuk mendapatkan session token UUID.",
      },
      response: {
        200: t.Object(
          {
            data: t.String({
              default: "550e8400-e29b-41d4-a716-446655440000",
              examples: ["550e8400-e29b-41d4-a716-446655440000"],
              description: "Session token UUID baru",
            }),
          },
          { description: "Login berhasil" }
        ),
        400: t.Object(
          {
            error: t.String({
              default: "Email atau password salah",
              examples: ["Email atau password salah"],
              description: "Pesan error autentikasi",
            }),
          },
          { description: "Email atau password tidak valid" }
        ),
      },
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
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Ambil Profil Pengguna Saat Ini",
        description:
          "Mengambil data profil pengguna yang sedang login berdasarkan Bearer token.",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object(
          {
            data: t.Object({
              id: t.Number({
                default: 1,
                examples: [1],
                description: "ID unik pengguna",
              }),
              name: t.String({
                default: "Eko Kurniawan",
                examples: ["Eko Kurniawan"],
                description: "Nama pengguna",
              }),
              email: t.String({
                default: "eko@localhost",
                examples: ["eko@localhost"],
                description: "Alamat email pengguna",
              }),
              created_at: t.Date({
                default: "2026-10-21T05:00:00.000Z",
                examples: ["2026-10-21T05:00:00.000Z"],
                description: "Waktu pembuatan akun",
              }),
            }),
          },
          { description: "Data profil pengguna berhasil diambil" }
        ),
        401: t.Object(
          {
            error: t.String({
              default: "Unauthorized",
              examples: ["Unauthorized"],
              description: "Pesan error tidak terotorisasi",
            }),
          },
          { description: "Bearer token tidak disertakan atau tidak valid" }
        ),
        500: t.Object(
          {
            error: t.String({
              default: "Internal Server Error",
              examples: ["Internal Server Error"],
              description: "Pesan kesalahan server internal",
            }),
          },
          { description: "Kesalahan server internal" }
        ),
      },
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
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Logout Pengguna",
        description:
          "Menghapus sesi token aktif dari database sehingga token tidak dapat digunakan kembali.",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object(
          {
            data: t.String({
              default: "OK",
              examples: ["OK"],
              description: "Status keberhasilan logout",
            }),
          },
          { description: "Logout berhasil dan session dihapus" }
        ),
        401: t.Object(
          {
            error: t.String({
              default: "Unauthorized",
              examples: ["Unauthorized"],
              description: "Pesan error tidak terotorisasi",
            }),
          },
          { description: "Bearer token tidak disertakan atau tidak valid" }
        ),
        500: t.Object(
          {
            error: t.String({
              default: "Internal Server Error",
              examples: ["Internal Server Error"],
              description: "Pesan kesalahan server internal",
            }),
          },
          { description: "Kesalahan server internal" }
        ),
      },
    }
  );
