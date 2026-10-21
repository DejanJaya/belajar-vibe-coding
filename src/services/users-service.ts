import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

/**
 * Mendaftarkan pengguna baru ke dalam database.
 * Memeriksa apakah email sudah digunakan, melakukan hashing password menggunakan algoritma bcrypt,
 * dan menyimpan data pengguna baru ke tabel `users`.
 *
 * @param input - Data registrasi yang berisi nama, email, dan password.
 * @returns Objek status `{ data: "OK" }` jika registrasi berhasil.
 * @throws Error("Email sudah terdaftar") jika email sudah digunakan oleh pengguna lain.
 */
export const registerUser = async (input: RegisterUserInput) => {
  // 1. Cek apakah email sudah terdaftar
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("Email sudah terdaftar");
  }

  // 2. Hash password menggunakan bcrypt
  const hashedPassword = await Bun.password.hash(input.password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  // 3. Simpan user baru ke database
  await db.insert(users).values({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });

  return { data: "OK" };
};

/**
 * Mengautentikasi pengguna berdasarkan email dan password, lalu membuat sesi login baru.
 * Memverifikasi kecocokan password dengan hash bcrypt di database, men-generate token UUID v4 baru,
 * dan menyimpannya ke tabel `sessions`.
 *
 * @param input - Kredensial login yang berisi email dan password.
 * @returns Objek `{ data: token }` berisi session token UUID v4.
 * @throws Error("Email atau password salah") jika email tidak ditemukan atau password tidak cocok.
 */
export const loginUser = async (input: LoginUserInput) => {
  // 1. Cari user di tabel users berdasarkan email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new Error("Email atau password salah");
  }

  // 2. Verifikasi password hash bcrypt
  const isPasswordValid = await Bun.password.verify(
    input.password,
    user.password
  );
  if (!isPasswordValid) {
    throw new Error("Email atau password salah");
  }

  // 3. Generate token UUID
  const token = crypto.randomUUID();

  // 4. Simpan session token ke database
  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  // 5. Return token
  return { data: token };
};

/**
 * Mengambil data profil pengguna yang sedang aktif (login) berdasarkan session token.
 * Mencari sesi di tabel `sessions`, lalu mengambil data pengguna terkait dari tabel `users`
 * tanpa menyertakan field sensitif `password`.
 *
 * @param token - Session token (Bearer token) milik pengguna.
 * @returns Objek `{ data: user }` berisi profil pengguna (`id`, `name`, `email`, `created_at`).
 * @throws Error("Unauthorized") jika token tidak valid atau pengguna tidak ditemukan.
 */
export const getCurrentUser = async (token: string) => {
  // 1. Cari data sesi di tabel sessions berdasarkan token
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (!session) {
    throw new Error("Unauthorized");
  }

  // 2. Cari user di tabel users berdasarkan session.userId (tanpa field password)
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      created_at: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    throw new Error("Unauthorized");
  }

  return { data: user };
};

/**
 * Mengakhiri sesi login pengguna (logout) dengan menghapus token sesi dari database.
 *
 * @param token - Session token (Bearer token) yang akan dihapus dari tabel `sessions`.
 * @returns Objek status `{ data: "OK" }` jika sesi berhasil dihapus.
 * @throws Error("Unauthorized") jika token sesi tidak ditemukan di database.
 */
export const logoutUser = async (token: string) => {
  // Hapus session langsung dalam 1 query dan cek affectedRows
  const [result] = await db
    .delete(sessions)
    .where(eq(sessions.token, token));

  if (result.affectedRows === 0) {
    throw new Error("Unauthorized");
  }

  return { data: "OK" };
};
