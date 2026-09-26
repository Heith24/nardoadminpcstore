# PC Store Admin

A full-stack PC store administration app using React, Ant Design, Express, REST, and SQL Server-ready repositories.

## Structure

- `client/` React + Vite + Ant Design admin UI
- `server/` Express REST API with auth middleware and MSSQL repositories
- `parts/` source images used by the one-time product import
- `.github/workflows/ci.yml` GitHub Actions build check

## Setup

### Automatic Setup (Windows PowerShell)

Use this path to let the scripts install/check prerequisites and configure the app:

1. Right-click `install-sqlserver.ps1` and choose **Run with PowerShell**. It requests administrator permission and installs SQL Server 2025 Express only if the local `SQLEXPRESS` instance is missing. SQL Server's installer may ask for confirmation.
2. Right-click `setup.ps1` and choose **Run with PowerShell**. It installs Node.js LTS and Microsoft ODBC Driver 18 if missing, applies `database/pc-store.sql`, installs npm dependencies, and starts the app.
3. If `pc_store` already exists, `setup.ps1` asks before applying migrations. Back up important data before confirming.

This path requires Windows Package Manager (`winget`, included with App Installer) and an account with SQL Server permissions. The setup scripts target the local `SQLEXPRESS` instance.

### Manual Setup (No PowerShell Scripts)

Use this path to install and configure each component yourself:

1. Install [SQL Server 2025 Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) with the Database Engine as a named instance called `SQLEXPRESS`. Add the current Windows account as a SQL Server administrator during installation.
2. Install [SQL Server Management Studio (SSMS)](https://learn.microsoft.com/en-us/ssms/install/install), [Node.js LTS](https://nodejs.org/en/download), and [Microsoft ODBC Driver 18](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server).
3. Open SSMS, connect to `localhost\SQLEXPRESS` with **Windows Authentication**, then execute `database/pc-store.sql`. It creates `pc_store` and seeds demo accounts and products. Back up an existing database before executing; the script applies migrations.
4. For a different SQL instance or port, create `server/.env` from `server/.env.example`, set `DB_SERVER` to the correct address (for example, `localhost,1433`), and ensure the Windows account running the API can access `pc_store`.
5. From Git Bash or a terminal at the project root, run:
	```bash
	npm run install:all
	npm run dev
	```
6. Open `http://localhost:5173`. To import the optional PC parts and sample images, run `npm run import:parts` from the project root.

### Demo Accounts

Local demo accounts created by `database/pc-store.sql`

- Superadmin: `superadmin@example.com` / `admin123`
- Admin: `admin@example.com` / `admin123`

These are fixed demo credentials; the app does not provide password changes. Replace them before production use. Superadmins can add admin and superadmin accounts from **Settings**.

The app runs at `http://localhost:5173`; the API runs at `http://localhost:4000`.



## API routes

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET|POST /api/users`
- `GET /api/users/:id/image`
- `GET|POST /api/products`
- `GET|PUT|DELETE /api/products/:id`
- `GET /api/reports/inventory`

## Database Notes

- The API uses Windows Authentication and defaults to `localhost\SQLEXPRESS`. Configure `server/.env` to override connection settings.
- The Windows account running setup needs `dbcreator` to create a fresh database; for an existing `pc_store`, grant it `db_owner` through **SSMS → Security → Logins → User Mapping**. Avoid granting `sysadmin` just for this app.
- Product images are stored as binary data in SQL Server. The `parts/` folder is only needed when running the optional importer.
- Login, product CRUD, categories, and inventory reports read and write SQL tables through parameterized repository queries.



## Challenges I Worked Through

One of the hardest parts was changing the database without throwing away existing products. Older versions stored a product's category as text; the new version links it to a category record. I also changed users from one name field to first and last names. During the migration, SQL Server reported `Invalid column name 'Category'` even though the old column was behind an `IF` check. I fixed that by running the legacy conversion only when the column exists, then removing it after the data has been copied.

Another lesson was that hiding a button is not the same as protecting an action. The Add staff button is only shown to superadmins, but the API checks the signed-in user's role too. That way, someone can't bypass the screen and call the endpoint directly.

Images took more work than just adding an upload button. They need to be validated, saved in SQL Server, and served back to the app. I also had to make sure a normal product edit keeps its image, while an explicit remove action clears it.

Getting setup reliable on another Windows machine was its own challenge. SQL Server instance names, Windows permissions, and the ODBC driver all have to line up. I separated SQL Server installation from app setup and documented both scripted and manual options so the steps are easier to follow.