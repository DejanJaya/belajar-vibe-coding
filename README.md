# Belajar Vibe Coding - Backend API

Backend API modern yang dibangun menggunakan **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL**.

## 🛠 Tech Stack
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Web Framework**: [ElysiaJS](https://elysiajs.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database Driver**: `mysql2`
- **Database**: MySQL

---

## 📋 Prasyarat
- [Bun](https://bun.sh/) (v1.0 atau lebih baru)
- MySQL Server yang sedang aktif

---

## 🚀 Setup & Instalasi

### 1. Install Dependencies
```bash
bun install
```

### 2. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` dan sesuaikan kredensial database Anda:
```bash
cp .env.example .env
```

Contoh konfigurasi `.env`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=belajar_vibe_coding
```

> **Catatan**: Pastikan database (contoh: `belajar_vibe_coding`) sudah dibuat di MySQL Anda.

### 3. Migrasi & Push Schema Database
Sinkronkan schema Drizzle ke MySQL:
```bash
bun run db:push
```

Untuk membuka GUI Drizzle Studio:
```bash
bun run db:studio
```

### 4. Menjalankan Server
Mode development (hot reload):
```bash
bun run dev
```

Mode production:
```bash
bun run start
```

Server akan aktif di: `http://localhost:3000`

---

## 📡 Daftar Endpoint API

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/` | Root info & greeting |
| `GET` | `/health` | Health check server & status koneksi MySQL |
| `GET` | `/users` | Mengambil seluruh data users |
| `GET` | `/users/:id` | Mengambil user berdasarkan ID |
| `POST` | `/users` | Menambahkan user baru (`name`, `email`) |
| `DELETE`| `/users/:id` | Menghapus user berdasarkan ID |

### Contoh Request `POST /users`:
```json
{
  "name": "Dejan",
  "email": "dejan@example.com"
}
```

---

## 📂 Struktur Project

```text
├── drizzle.config.ts    # Konfigurasi Drizzle Kit
├── package.json         # Dependensi & script Bun
├── tsconfig.json        # Konfigurasi TypeScript
├── .env.example         # Template konfigurasi environment
├── .gitignore           # Git ignore rules
├── issue.md             # High-level issue planning
└── src/
    ├── index.ts         # Entry point server Elysia
    ├── db/
    │   ├── index.ts     # Koneksi MySQL & inisialisasi Drizzle ORM
    │   └── schema.ts    # Definisi tabel / schema database
    └── routes/
        └── users.ts     # Endpoint routing & validasi untuk users
```
