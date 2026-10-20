# Feature: Registrasi User Baru (Users Registration API)

## 📌 Ringkasan Fitur
Implementasi fitur pendaftaran pengguna baru (User Registration) dengan menyimpan data ke MySQL melalui Drizzle ORM, enkripsi password menggunakan bcrypt, dan memisahkan arsitektur kode ke dalam layer **Routes** dan **Services**.

Dokumen ini disusun sebagai panduan bertahap (step-by-step) untuk **Junior Programmer** atau **AI Model** pelaksana.

---

## 🏗 Struktur Folder & Konvensi Penamaan File

Pastikan struktur folder di dalam `src/` mengikuti aturan berikut:

```text
src/
├── db/
│   ├── index.ts              # Konfigurasi koneksi MySQL & Drizzle instance
│   └── schema.ts             # Definisi skema tabel database
├── services/                 # Layer Business Logic
│   └── users-service.ts      # Logika pendaftaran, hashing, & validasi email unik
├── routes/                   # Layer Routing & Validasi ElysiaJS
│   └── users-route.ts        # Endpoint API ElysiaJS (POST /api/users)
└── index.ts                  # Main entry point server Elysia
```

> **Aturan Penamaan File:**
> - File routing harus berformat: `<nama>-route.ts` (contoh: `users-route.ts`).
> - File service harus berformat: `<nama>-service.ts` (contoh: `users-service.ts`).

---

## 📋 Spesifikasi Kebutuhan

### 1. Skema Tabel `users`
Tabel `users` pada MySQL harus memiliki kolom sebagai berikut:

| Nama Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | `INT` / `SERIAL` | Primary Key, Auto Increment |
| `name` | `VARCHAR(255)` | Not Null |
| `email` | `VARCHAR(255)` | Not Null, Unique |
| `password` | `VARCHAR(255)` | Not Null (Hash bcrypt) |
| `created_at` | `TIMESTAMP` | Not Null, Default `CURRENT_TIMESTAMP` |

### 2. Spesifikasi Endpoint API
- **URL**: `/api/users`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "name": "Eko",
  "email": "eko@localhost",
  "password": "rahasia"
}
```

#### Response Body (Success - HTTP 200 / 201)
```json
{
  "data": "OK"
}
```

#### Response Body (Error - HTTP 400)
Jika email sudah terdaftar:
```json
{
  "error": "Email sudah terdaftar"
}
```

---

## 🛠 Tahapan Implementasi

### Tahap 1: Update Skema Database (`src/db/schema.ts`)
1. Buka file `src/db/schema.ts`.
2. Sesuaikan definisi tabel `users`:
   - Tambahkan kolom `password: varchar("password", { length: 255 }).notNull()`.
   - Pastikan kolom `id`, `name`, `email` (unique), dan `created_at` (default now) sudah sesuai dengan spesifikasi.
3. Ekspor tipe `User` (`$inferSelect`) dan `NewUser` (`$inferInsert`).
4. Jalankan perintah migrasi/push schema ke database:
   ```bash
   bun run db:push
   ```

---

### Tahap 2: Buat Business Logic Service (`src/services/users-service.ts`)
1. Buat direktori `src/services/` jika belum ada.
2. Buat file `src/services/users-service.ts`.
3. Definisikan interface/type input registrasi:
   ```ts
   export interface RegisterUserInput {
     name: string;
     email: string;
     password: string;
   }
   ```
4. Buat fungsi registrasi (misal: `registerUser(input: RegisterUserInput)`):
   - **Langkah 1 (Cek Email Unik)**: Lakukan query ke tabel `users` berdasarkan `email`. Jika sudah ada user dengan email tersebut, lempar error:
     ```ts
     throw new Error("Email sudah terdaftar");
     ```
   - **Langkah 2 (Hash Password)**: Enkripsi password menggunakan bcrypt.
     > 💡 **Tips Bun:** Gunakan fungsi bawaan Bun yang cepat tanpa dependensi tambahan:
     > ```ts
     > const hashedPassword = await Bun.password.hash(input.password, {
     >   algorithm: "bcrypt",
     >   cost: 10,
     > });
     > ```
     > *(Atau gunakan library bcryptjs jika Bun.password tidak tersedia).*
   - **Langkah 3 (Insert ke DB)**: Simpan user baru ke database (`name`, `email`, `password: hashedPassword`).
   - **Langkah 4 (Return)**: Kembalikan hasil atau konfirmasi berhasil.

---

### Tahap 3: Buat Routing ElysiaJS (`src/routes/users-route.ts`)
1. Buat direktori `src/routes/` jika belum ada.
2. Buat file `src/routes/users-route.ts`.
3. Inisialisasi router Elysia dengan prefix `/api/users`:
   ```ts
   import { Elysia, t } from "elysia";
   import { registerUser } from "../services/users-service";

   export const usersRoute = new Elysia({ prefix: "/api/users" })
     .post(
       "/",
       async ({ body, set }) => {
         try {
           await registerUser(body);
           set.status = 200; // atau 201
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
           name: t.String({ minLength: 1, error: "Nama tidak boleh kosong" }),
           email: t.String({ format: "email", error: "Format email tidak valid" }),
           password: t.String({ minLength: 1, error: "Password tidak boleh kosong" }),
         }),
       }
     );
   ```

---

### Tahap 4: Daftarkan Route ke Main App (`src/index.ts`)
1. Buka file `src/index.ts`.
2. Import `usersRoute` dari `./routes/users-route`.
3. Daftarkan router menggunakan `.use(usersRoute)`.
4. Pastikan server tetap mengekspor endpoint health check dan konfigurasi sebelumnya jika masih diperlukan.

---

### Tahap 5: Verifikasi & Pengujian (Testing)

Jalankan server dalam mode development:
```bash
bun run dev
```

Lakukan pengujian menggunakan `curl` atau REST Client:

1. **Test Registrasi Berhasil (Positive Test)**:
   ```bash
   curl -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -d "{\"name\": \"Eko\", \"email\": \"eko@localhost\", \"password\": \"rahasia\"}"
   ```
   *Expected Response:*
   ```json
   {
     "data": "OK"
   }
   ```

2. **Test Registrasi Email Duplikat (Negative Test)**:
   Jalankan kembali perintah di atas dengan email yang sama (`eko@localhost`).
   *Expected Response (Status 400):*
   ```json
   {
     "error": "Email sudah terdaftar"
   }
   ```

3. **Verifikasi Hash Password di Database**:
   - Pastikan password yang tersimpan di kolom `password` pada database MySQL berupa string hash bcrypt (dimulai dengan `$2a$` atau `$2b$`), bukan teks asli ("rahasia").

---

## ✅ Kriteria Selesai (Definition of Done)
- [ ] Tabel `users` memiliki kolom `id`, `name`, `email`, `password`, dan `created_at`.
- [ ] Schema database berhasil disinkronkan ke MySQL (`bun run db:push`).
- [ ] File `src/services/users-service.ts` menangani logic hashing password (bcrypt) dan pengecekan email unik.
- [ ] File `src/routes/users-route.ts` menangani endpoint `POST /api/users` dan validasi schema request.
- [ ] `POST /api/users` mengembalikan `{"data": "OK"}` jika sukses.
- [ ] `POST /api/users` mengembalikan `{"error": "Email sudah terdaftar"}` jika email duplikat.
- [ ] Password tersimpan dalam bentuk hash bcrypt.
- [ ] Server berjalan normal dengan `bun run dev` dan lulus typecheck (`bun x tsc --noEmit`).
