# PC Store Admin

A full-stack PC store administration app using React, Ant Design, Express, REST, and SQL Server-ready repositories.

## Structure

- `client/` React + Vite + Ant Design admin UI
- `server/` Express REST API with auth middleware and MSSQL repositories
- `parts/` source images used by the one-time product import
- `.github/workflows/ci.yml` GitHub Actions build check

## Run locally

```bash
npm run install:all
npm run dev
```

On Windows, right-click `setup.ps1` and choose **Run with PowerShell**. It requests administrator permission and requires `winget` (App Installer). It installs Node.js LTS and Microsoft ODBC Driver 18 if missing; it reuses an existing `SQLEXPRESS` instance or installs SQL Server 2025 Express if none is found. SQL Server's installer may require confirmation. The script then applies the database script, installs dependencies, and starts the app. If `pc_store` already exists, it asks before applying migrations.

Client: `http://localhost:5173`  
API: `http://localhost:4000`

Local demo accounts created by `database/pc-store.sql` 

- Superadmin: `superadmin@example.com` / `admin123`
- Admin: `admin@example.com` / `admin123`

These are fixed demo credentials; the app does not provide password changes. Replace the demo credentials in the database before using it outside local development. Superadmins can add admin and superadmin accounts from **Settings**.

## API routes

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET|POST /api/users`
- `GET /api/users/:id/image`
- `GET|POST /api/products`
- `GET|PUT|DELETE /api/products/:id`
- `GET /api/reports/inventory`

## MSSQL setup

The starter schema is in `database/pc-store.sql`.

1. Open SQL Server Management Studio and connect to your SQL Server Database Engine.
2. Open `database/pc-store.sql` and execute it. On a fresh database, the result should show `pc_store`, `2` users, and `2` products. Existing databases may show higher counts; rerunning the script applies the schema and role migrations while preserving existing product rows.
3. The API uses Windows Authentication and connects to the local `SQLEXPRESS` instance at `localhost\SQLEXPRESS`. Copy `server/.env.example` to `server/.env` only if you need to override the defaults.
4. Import the starter PC parts and their image files into SQL Server with `npm run import:parts`. The command is repeat-safe and preserves existing prices and stock.
5. Product image uploads are stored as binary data in SQL Server; the `parts/` folder is only needed when running the import command.
6. Login, product CRUD, categories, and inventory reports read and write SQL tables through parameterized repository queries.

