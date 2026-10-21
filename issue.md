# Feature: API User Logout (DELETE /api/users/logout)

## 📌 Ringkasan Fitur
Implementasi endpoint untuk proses logout pengguna (`user logout`). Saat request logout berhasil, sistem akan menghapus data sesi yang bersangkutan dari tabel `sessions` di database MySQL berdasarkan token otentikasi yang dikirimkan melalui header `Authorization: Bearer <token>`.

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
│   └── users-service.ts      # Logic registrasi, login, get current user, & logout
├── routes/                   # Layer Routing & Validasi ElysiaJS
│   └── users-route.ts        # Endpoint registrasi, login, get current, & DELETE /api/users/logout
└── index.ts                  # Entry point server Elysia
```

> **Aturan Penamaan File:**
> - File routing harus berformat: `<nama>-route.ts` (contoh: `users-route.ts`).
> - File service harus berformat: `<nama>-service.ts` (contoh: `users-service.ts`).

---

## 📋 Spesifikasi Kebutuhan

### 1. Spesifikasi Endpoint API
- **URL**: `/api/users/logout`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization`: `Bearer <token>` (token UUID sesi login yang tersimpan di tabel `sessions`)

### 2. Response Body (Success - HTTP 200)
Jika token valid dan session berhasil dihapus dari tabel `sessions`:
```json
{
  "data": "OK"
}
```

> ⚠️ **PENTING**: Data record pada tabel `sessions` dengan token tersebut **wajib terhapus** dari database. Setelah logout, token tersebut tidak boleh lagi dapat digunakan untuk mengakses endpoint yang membutuhkan otentikasi (misal: `GET /api/users/current`).

### 3. Response Body (Error - HTTP 401)
Jika header `Authorization` tidak dikirim, format token tidak valid, atau token tidak ditemukan di tabel `sessions`:
```json
{
  "error": "Unauthorized"
}
```

---

## 🛠 Tahapan Implementasi

### Tahap 1: Tambahkan Business Logic Logout di Service (`src/services/users-service.ts`)
1. Buka file `src/services/users-service.ts`.
2. Buat fungsi `logoutUser(token: string)`:
   - **Langkah 1 (Verifikasi Keberadaan Session)**: Cari data sesi di tabel `sessions` berdasarkan `token`:
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
   - **Langkah 2 (Hapus Session dari Database)**: Hapus session dari tabel `sessions`:
     ```ts
     await db
       .delete(sessions)
       .where(eq(sessions.token, token));
     ```
   - **Langkah 3 (Return Konfirmasi)**: Kembalikan objek `{ data: "OK" }`.

---

### Tahap 2: Tambahkan Endpoint di Routing ElysiaJS (`src/routes/users-route.ts`)
1. Buka file `src/routes/users-route.ts`.
2. Import fungsi `logoutUser` dari `../services/users-service`.
3. Tambahkan route handler `.delete("/logout", ...)` ke dalam `usersRoute`:
   ```ts
   .delete(
     "/logout",
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

         const result = await logoutUser(token);
         set.status = 200;
         return result; // mengembalikan { data: "OK" }
       } catch (error: any) {
         set.status = 401;
         return { error: "Unauthorized" };
       }
     }
   )
   ```
   *Catatan: Karena prefix router adalah `/api/users`, route `/logout` secara otomatis menjadi `/api/users/logout`.*

---

### Tahap 3: Buat Automated Tests (`test/users-route.test.ts`)
1. Buka file `test/users-route.test.ts`.
2. Tambahkan test suite `describe("DELETE /api/users/logout")`:
   - **Skenario 1 (Logout Sukses)**:
     - Register user baru dan login untuk mendapatkan token session.
     - Lakukan request `DELETE /api/users/logout` dengan header `Authorization: Bearer <token>`.
     - Verifikasi status response `200` dan body `{"data": "OK"}`.
     - Query tabel `sessions` di database untuk memastikan token tersebut **sudah tidak ada**.
     - Coba akses `GET /api/users/current` menggunakan token tersebut $\rightarrow$ pastikan responsnya `401 Unauthorized`.
   - **Skenario 2 (Logout Gagal - Tanpa Header Authorization)**:
     - Lakukan request `DELETE /api/users/logout` tanpa menyertakan header `Authorization`.
     - Verifikasi status response `401` dan body `{"error": "Unauthorized"}`.
   - **Skenario 3 (Logout Gagal - Token Invalid / Tidak Ditemukan)**:
     - Lakukan request `DELETE /api/users/logout` dengan header `Authorization: Bearer token-ngawur`.
     - Verifikasi status response `401` dan body `{"error": "Unauthorized"}`.

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

1. **Logout Berhasil**:
   ```bash
   curl -X DELETE http://localhost:3000/api/users/logout \
     -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"
   ```
   *Response (200 OK):*
   ```json
   {
     "data": "OK"
   }
   ```

2. **Logout Gagal (Token Tidak Ada / Invalid)**:
   ```bash
   curl -X DELETE http://localhost:3000/api/users/logout
   ```
   *Response (401 Unauthorized):*
   ```json
   {
     "error": "Unauthorized"
   }
   ```

---

## ✅ Kriteria Selesai (Definition of Done)
- [x] Fungsi `logoutUser` diimplementasikan di `src/services/users-service.ts`.
- [x] Endpoint `DELETE /api/users/logout` diimplementasikan di `src/routes/users-route.ts`.
- [x] Header `Authorization: Bearer <token>` diekstrak dan divalidasi dengan benar.
- [x] Record session dengan token tersebut terhapus dari tabel `sessions` di MySQL saat logout berhasil.
- [x] Mengembalikan `{"data": "OK"}` dengan status HTTP 200 saat logout berhasil.
- [x] Token yang telah di-logout tidak dapat digunakan lagi untuk memanggil `GET /api/users/current`.
- [x] Mengembalikan `{"error": "Unauthorized"}` dengan status HTTP 401 saat token tidak ada, format salah, atau tidak ditemukan di tabel `sessions`.
- [x] Seluruh automated test lolos (`bun test`) dan lulus validasi TypeScript (`bun x tsc --noEmit`).
