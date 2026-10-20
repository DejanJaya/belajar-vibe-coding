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

Menjalankan automated test:
```bash
bun test
```

Server akan aktif di: `http://localhost:3000`

---

## 📡 Daftar Endpoint API

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/` | Root info & greeting |
| `GET` | `/health` | Health check server & status koneksi MySQL |
| `POST` | `/api/users` | Registrasi user baru (password di-hash dengan bcrypt) |

### Contoh Request `POST /api/users`:
```json
{
  "name": "Eko",
  "email": "eko@localhost",
  "password": "rahasia"
}
```

#### Response Sukses (HTTP 200):
```json
{
  "data": "OK"
}
```

#### Response Error (HTTP 400):
```json
{
  "error": "Email sudah terdaftar"
}
```

---

## 📂 Struktur Project

```text
├── drizzle.config.ts        # Konfigurasi Drizzle Kit
├── package.json             # Dependensi & script Bun
├── tsconfig.json            # Konfigurasi TypeScript
├── .env.example             # Template konfigurasi environment
├── .gitignore               # Git ignore rules
├── issue.md                 # Dokumentasi issue & planning
├── test/
│   └── users-route.test.ts  # Automated test endpoint users
└── src/
    ├── index.ts             # Entry point server Elysia
    ├── db/
    │   ├── index.ts         # Koneksi MySQL & inisialisasi Drizzle ORM
    │   └── schema.ts        # Definisi tabel / schema database (users)
    ├── services/
    │   └── users-service.ts # Business logic registrasi user & hashing password
    └── routes/
        └── users-route.ts   # Endpoint routing & validasi request users
```
