# Feature: API Get Current User (GET /api/users/current)

## 📌 Ringkasan Fitur
Implementasi endpoint untuk mendapatkan profil data user yang sedang login (`current user`) berdasarkan token otentikasi yang dikirimkan melalui header `Authorization: Bearer <token>`. Token ini akan diverifikasi terhadap data sesi di tabel `sessions`, lalu sistem mengambil informasi detail user dari tabel `users` (tanpa menyertakan hash password).

Dokumen ini disusun sebagai panduan bertahap (step-by-step) untuk **Junior Programmer** atau **AI Model** pelaksana.

---

## 🏗 Struktur Folder & Konvensi Penamaan File

Pastikan struktur file tetap mengikuti arsitektur yang sudah berjalan di dalam folder `src/`:

```text
src/
├── db/
│   ├── index.ts              # Konfigurasi koneksi MySQL & instance Drizzle
│   └── schema.ts             # Definisi skema tabel users & sessions
├── services/                 # Layer Business Logic
│   └── users-service.ts      # Logic registrasi, login, & get current user
├── routes/                   # Layer Routing & Validasi ElysiaJS
│   └── users-route.ts        # Endpoint registrasi, login, & GET /api/users/current
└── index.ts                  # Entry point server Elysia
```

> **Aturan Penamaan File:**
> - File routing harus berformat: `<nama>-route.ts` (contoh: `users-route.ts`).
> - File service harus berformat: `<nama>-service.ts` (contoh: `users-service.ts`).

---

## 📋 Spesifikasi Kebutuhan

### 1. Spesifikasi Endpoint API
- **URL**: `/api/users/current`
- **Method**: `GET`
- **Headers**:
  - `Authorization`: `Bearer <token>` (token UUID sesi login yang tersimpan di tabel `sessions`)

### 2. Response Body (Success - HTTP 200)
Jika token valid dan sesi ditemukan di database:
```json
{
  "data": {
    "id": 1,
    "name": "eko",
    "email": "eko@localhost",
    "created_at": "2026-10-20T11:00:00.000Z"
  }
}
```
> ⚠️ **PENTING**: Kolom `password` **TIDAK BOLEH** disertakan dalam response data demi keamanan!

### 3. Response Body (Error - HTTP 401)
Jika header `Authorization` tidak dikirim, format token tidak valid, atau token tidak ditemukan di tabel `sessions`:
```json
{
  "error": "Unauthorized"
}
```

---

## 🛠 Tahapan Implementasi

### Tahap 1: Tambahkan Business Logic di Service (`src/services/users-service.ts`)
1. Buka file `src/services/users-service.ts`.
2. Buat fungsi `getCurrentUser(token: string)`:
   - **Langkah 1 (Cari Session)**: Cari data sesi di tabel `sessions` berdasarkan `token`:
     ```ts
     const [session] = await db
       .select()
       .from(sessions)
       .where(eq(sessions.token, token))
       .limit(1);

     if (!session) {
       throw new Error("Unauthorized");
     }
     ```
   - **Langkah 2 (Cari User)**: Cari user di tabel `users` berdasarkan `session.userId`:
     ```ts
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
     ```
   - **Langkah 3 (Return Data)**: Kembalikan objek `{ data: user }`.

---

### Tahap 2: Tambahkan Endpoint di Routing ElysiaJS (`src/routes/users-route.ts`)
1. Buka file `src/routes/users-route.ts`.
2. Import fungsi `getCurrentUser` dari `../services/users-service`.
3. Tambahkan route handler `.get("/current", ...)` ke dalam `usersRoute`:
   ```ts
   .get(
     "/current",
     async ({ headers, set }) => {
       try {
         const authorization = headers["authorization"];
         if (!authorization || !authorization.startsWith("Bearer ")) {
           set.status = 401;
           return { error: "Unauthorized" };
         }

         const token = authorization.slice(7).trim();
         if (!token) {
           set.status = 401;
           return { error: "Unauthorized" };
         }

         const result = await getCurrentUser(token);
         set.status = 200;
         return result;
       } catch (error: any) {
         set.status = 401;
         return { error: "Unauthorized" };
       }
     }
   )
   ```
   *Catatan: Karena prefix router adalah `/api/users`, route `/current` secara otomatis menjadi `/api/users/current`.*

---

### Tahap 3: Buat Automated Tests (`test/users-route.test.ts`)
1. Buka file `test/users-route.test.ts`.
2. Tambahkan test suite `describe("GET /api/users/current")`:
   - **Skenario 1 (Sukses)**:
     - Login user untuk mendapatkan token.
     - Lakukan request `GET /api/users/current` dengan header `Authorization: Bearer <token>`.
     - Verifikasi status response `200`.
     - Verifikasi data `id`, `name`, `email`, dan `created_at` sesuai dengan data user.
     - Pastikan `password` **tidak ada** di dalam response object.
   - **Skenario 2 (Gagal - Tanpa Token / Header Authorization Kosong)**:
     - Lakukan request `GET /api/users/current` tanpa menyertakan header `Authorization`.
     - Verifikasi status response `401`.
     - Verifikasi response body `{"error": "Unauthorized"}`.
   - **Skenario 3 (Gagal - Token Salah / Tidak Ada di Database)**:
     - Lakukan request `GET /api/users/current` dengan header `Authorization: Bearer token-acak-palsu`.
     - Verifikasi status response `401`.
     - Verifikasi response body `{"error": "Unauthorized"}`.

3. Jalankan pengujian otomatis:
   ```bash
   bun test
   ```

4. Jalankan validasi tipe TypeScript:
   ```bash
   bun x tsc --noEmit
   ```

---

## 🧪 Contoh Pengujian Manual (cURL)

1. **Request Berhasil**:
   ```bash
   curl -X GET http://localhost:3000/api/users/current \
     -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"
   ```
   *Response (200 OK):*
   ```json
   {
     "data": {
       "id": 1,
       "name": "Eko",
       "email": "eko@localhost",
       "created_at": "2026-10-20T11:00:00.000Z"
     }
   }
   ```

2. **Request Gagal (Token Tidak Valid / Tanpa Header)**:
   ```bash
   curl -X GET http://localhost:3000/api/users/current
   ```
   *Response (401 Unauthorized):*
   ```json
   {
     "error": "Unauthorized"
   }
   ```

---

## ✅ Kriteria Selesai (Definition of Done)
- [x] Fungsi `getCurrentUser` diimplementasikan di `src/services/users-service.ts`.
- [x] Endpoint `GET /api/users/current` diimplementasikan di `src/routes/users-route.ts`.
- [x] Header `Authorization: Bearer <token>` diekstrak dan divalidasi dengan benar.
- [x] Mengembalikan data user (`id`, `name`, `email`, `created_at`) dengan status HTTP 200 jika token valid.
- [x] Kolom `password` tidak bocor / tidak disertakan dalam response body.
- [x] Mengembalikan `{"error": "Unauthorized"}` dengan status HTTP 401 jika token tidak ada, salah, atau tidak ditemukan di tabel `sessions`.
- [x] Lulus pengujian otomatis (`bun test`) dan validasi tipe TypeScript (`bun x tsc --noEmit`).
