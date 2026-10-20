# Feature: Autentikasi Login User & Manajemen Session (User Login API)

## 📌 Ringkasan Fitur
Implementasi fitur login user untuk menghasilkan token sesi login (UUID) yang disimpan ke dalam tabel `sessions` di database MySQL. Fitur ini memverifikasi kecocokan email dan hash password bcrypt yang ada di tabel `users`.

Dokumen ini disusun sebagai panduan bertahap (step-by-step) untuk **Junior Programmer** atau **AI Model** pelaksana.

---

## 🏗 Struktur Folder & Konvensi Penamaan File

Pastikan struktur file tetap mengikuti standar arsitektur yang sudah ada di dalam `src/`:

```text
src/
├── db/
│   ├── index.ts              # Konfigurasi koneksi MySQL & instance Drizzle
│   └── schema.ts             # Definisi skema tabel users & sessions
├── services/                 # Layer Business Logic
│   └── users-service.ts      # Logic registrasi, login, verifikasi password & create session
├── routes/                   # Layer Routing & Validasi ElysiaJS
│   └── users-route.ts        # Endpoint POST /api/users & POST /api/users/login
└── index.ts                  # Entry point server Elysia
```

> **Aturan Penamaan File:**
> - File routing harus berformat: `<nama>-route.ts` (contoh: `users-route.ts`).
> - File service harus berformat: `<nama>-service.ts` (contoh: `users-service.ts`).

---

## 📋 Spesifikasi Kebutuhan

### 1. Skema Tabel `sessions`
Tambahkan tabel `sessions` pada MySQL dengan struktur kolom sebagai berikut:

| Nama Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | `INT` | Primary Key, Auto Increment |
| `token` | `VARCHAR(255)` | Not Null (berisi UUID token session login) |
| `user_id` | `INT` | Not Null, Foreign Key mengarah ke `users.id` |
| `created_at` | `TIMESTAMP` | Not Null, Default `CURRENT_TIMESTAMP` |

### 2. Spesifikasi Endpoint API Login
- **URL**: `/api/users/login`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "email": "eko@localhost",
  "password": "rahasia"
}
```

#### Response Body (Success - HTTP 200)
Mengembalikan token UUID yang berhasil digenerate dan disimpan di tabel `sessions`:
```json
{
  "data": "550e8400-e29b-41d4-a716-446655440000"
}
```
*(Nilai `"data"` adalah string token UUID sesi yang aktif).*

#### Response Body (Error - HTTP 400)
Jika email tidak ditemukan ATAU password salah (gunakan pesan umum demi keamanan):
```json
{
  "error": "Email atau password salah"
}
```

---

## 🛠 Tahapan Implementasi

### Tahap 1: Tambahkan Skema Tabel `sessions` (`src/db/schema.ts`)
1. Buka file `src/db/schema.ts`.
2. Definisikan tabel `sessions` menggunakan Drizzle MySQL core:
   ```ts
   export const sessions = mysqlTable("sessions", {
     id: int("id").autoincrement().primaryKey(),
     token: varchar("token", { length: 255 }).notNull(),
     userId: int("user_id")
       .notNull()
       .references(() => users.id),
     createdAt: timestamp("created_at").defaultNow().notNull(),
   });

   export type Session = typeof sessions.$inferSelect;
   export type NewSession = typeof sessions.$inferInsert;
   ```
3. Ekspor tipe `Session` dan `NewSession`.
4. Jalankan sinkronisasi skema ke database MySQL:
   ```bash
   bun run db:push
   ```

---

### Tahap 2: Tambahkan Business Logic Login (`src/services/users-service.ts`)
1. Buka file `src/services/users-service.ts`.
2. Buat tipe/interface input login:
   ```ts
   export interface LoginUserInput {
     email: string;
     password: string;
   }
   ```
3. Buat fungsi `loginUser(input: LoginUserInput)`:
   - **Langkah 1 (Cari User)**: Cari user di tabel `users` berdasarkan email.
     ```ts
     const [user] = await db
       .select()
       .from(users)
       .where(eq(users.email, input.email))
       .limit(1);

     if (!user) {
       throw new Error("Email atau password salah");
     }
     ```
   - **Langkah 2 (Verifikasi Password)**: Gunakan `Bun.password.verify` untuk membandingkan password input dengan hash di database:
     ```ts
     const isPasswordValid = await Bun.password.verify(input.password, user.password);
     if (!isPasswordValid) {
       throw new Error("Email atau password salah");
     }
     ```
   - **Langkah 3 (Generate Token UUID)**: Buat token acak menggunakan `crypto.randomUUID()`:
     ```ts
     const token = crypto.randomUUID();
     ```
   - **Langkah 4 (Simpan ke Tabel Sessions)**: Insert token dan `userId` ke tabel `sessions`:
     ```ts
     await db.insert(sessions).values({
       token,
       userId: user.id,
     });
     ```
   - **Langkah 5 (Return)**: Kembalikan objek `{ data: token }`.

---

### Tahap 3: Tambahkan Route Login di ElysiaJS (`src/routes/users-route.ts`)
1. Buka file `src/routes/users-route.ts`.
2. Import fungsi `loginUser` dari `../services/users-service`.
3. Tambahkan route handler `.post("/login", ...)` ke router `usersRoute`:
   ```ts
   .post(
     "/login",
     async ({ body, set }) => {
       try {
         const result = await loginUser(body);
         set.status = 200;
         return result; // mengembalikan { data: token }
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
   ```
   *Catatan: Karena prefix router adalah `/api/users`, route `/login` secara otomatis menjadi `/api/users/login`.*

---

### Tahap 4: Buat Automated Tests & Pengujian (`test/users-route.test.ts`)
1. Buka/tambahkan skenario pengujian di `test/users-route.test.ts`:
   - **Skenario 1 (Login Sukses)**: Registrasi user terlebih dahulu, lalu lakukan `POST /api/users/login` dengan email dan password yang sesuai.
     - Verifikasi status response `200`.
     - Verifikasi response body memiliki properti `data` berupa string token UUID.
     - Verifikasi token tersebut benar-benar tersimpan di tabel `sessions`.
   - **Skenario 2 (Login Gagal - Email Tidak Terdaftar)**: Request dengan email acak yang belum terdaftar.
     - Verifikasi status response `400`.
     - Verifikasi response body `{"error": "Email atau password salah"}`.
   - **Skenario 3 (Login Gagal - Password Salah)**: Request dengan email terdaftar tetapi password salah.
     - Verifikasi status response `400`.
     - Verifikasi response body `{"error": "Email atau password salah"}`.

2. Jalankan test otomatis:
   ```bash
   bun test
   ```

3. Jalankan typecheck:
   ```bash
   bun x tsc --noEmit
   ```

---

## 🧪 Contoh Pengujian Manual (cURL)

1. **Login Sukses**:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d "{\"email\": \"eko@localhost\", \"password\": \"rahasia\"}"
   ```
   *Response (200 OK):*
   ```json
   {
     "data": "d1c25867-b50e-436f-b258-37299a4cbe6a"
   }
   ```

2. **Login Gagal (Password atau Email Salah)**:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d "{\"email\": \"eko@localhost\", \"password\": \"passwordsalah\"}"
   ```
   *Response (400 Bad Request):*
   ```json
   {
     "error": "Email atau password salah"
   }
   ```

---

## ✅ Kriteria Selesai (Definition of Done)
- [x] Skema tabel `sessions` dibuat di `src/db/schema.ts` dengan kolom `id`, `token`, `user_id` (FK ke `users.id`), dan `created_at`.
- [x] Skema tabel berhasil disinkronkan ke database MySQL via `bun run db:push`.
- [x] Fungsi `loginUser` diimplementasikan di `src/services/users-service.ts` dengan verifikasi bcrypt dan pembuatan token UUID via `crypto.randomUUID()`.
- [x] Endpoint `POST /api/users/login` diimplementasikan di `src/routes/users-route.ts`.
- [x] Berhasil mengembalikan `{"data": "<token>"}` saat kredensial valid (HTTP 200).
- [x] Berhasil mengembalikan `{"error": "Email atau password salah"}` saat kredensial tidak valid (HTTP 400).
- [x] Data sesi login tersimpan di tabel `sessions`.
- [x] Lulus pengujian otomatis (`bun test`) dan validasi tipe TypeScript (`bun x tsc --noEmit`).
