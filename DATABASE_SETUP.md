# Database Setup Instructions

## Prerequisites
- PostgreSQL installed on your system
- Node.js and npm installed

## Setup Steps

### 1. Install PostgreSQL (if not already installed)

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from https://www.postgresql.org/download/windows/

### 2. Create Environment File

Copy the example environment file and update with your database credentials:

```bash
cp .env.example .env
```

Edit `.env` and update the DATABASE_URL:
```
DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/fantasy_draft_helper
```

For local development, you might use:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fantasy_draft_helper
```

### 3. Create Database and Tables

Run the setup script:
```bash
npm run db:setup
```

This will:
1. Create the database `fantasy_draft_helper`
2. Create all necessary tables
3. Import existing data from JSON files

If you need to run these steps individually:
```bash
npm run db:create    # Create database
npm run db:schema    # Create tables
npm run db:migrate   # Import data from JSON files
```

### 4. Start the Application

```bash
npm start
```

The application will now use PostgreSQL for data persistence.

## Manual Database Setup (Alternative)

If the npm scripts don't work, you can set up manually:

1. Connect to PostgreSQL:
```bash
psql -U postgres
```

2. Create the database:
```sql
CREATE DATABASE fantasy_draft_helper;
\c fantasy_draft_helper
```

3. Run the schema file:
```bash
psql -U postgres -d fantasy_draft_helper -f database/schema.sql
```

4. Import existing data:
```bash
node database/migrate.js
```

## Backup and Restore

### Export/Backup Data
Use the Export button in the app to download a JSON backup of your draft data.

### Import/Restore Data
Use the Import button in the app to restore from a previously exported JSON file.

## Troubleshooting

### Connection Issues
- Ensure PostgreSQL is running: `pg_isready`
- Check your DATABASE_URL in `.env`
- Verify PostgreSQL is accepting connections on localhost

### Permission Issues
- You may need to create a PostgreSQL user:
```sql
CREATE USER yourusername WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE fantasy_draft_helper TO yourusername;
```

### Reset Database
To completely reset and start fresh:
```bash
psql -U postgres -c "DROP DATABASE IF EXISTS fantasy_draft_helper;"
npm run db:setup
```

## Switching Back to JSON Files

If you prefer to use the JSON file-based version:
```bash
npm run start:json
```

This will use the original `server.js` that reads from JSON files.