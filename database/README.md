# Database Setup Guide

## Local Development

1. **Install PostgreSQL** (if not already installed):
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```

2. **Create local database**:
   ```bash
   createdb fantasy_draft_helper
   ```

3. **Load schema and data**:
   ```bash
   psql -d fantasy_draft_helper < database/schema.sql
   node database/import-players.js
   ```

4. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Keep default local settings

## Production Setup (Render)

### Step 1: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - Name: `fantasy-draft-helper-db`
   - Region: Choose closest to you
   - PostgreSQL Version: 16
   - Plan: Free tier
4. Click "Create Database"
5. Copy the **External Database URL** from the database dashboard

### Step 2: Load Data to Render Database

#### Option A: Using psql command line
```bash
psql "YOUR_EXTERNAL_DATABASE_URL" < database/setup-render.sql
```

#### Option B: Using Render's SQL Editor
1. Go to your database in Render dashboard
2. Click on "PSQL Command" or "Connect" → "External Connection"
3. Copy and paste the contents of `database/setup-render.sql`

### Step 3: Deploy Web Service on Render

1. In Render Dashboard, click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - Name: `fantasy-draft-helper`
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server-pg.js`
4. Add Environment Variables:
   - `DATABASE_URL`: Paste the **Internal Database URL** from your Render database
   - `NODE_ENV`: `production`
5. Click "Create Web Service"

## Environment Variables

The application automatically detects and switches between local and production configurations:

### Local (.env)
```
DATABASE_URL=postgresql://localhost:5432/fantasy_draft_helper
PORT=8081
NODE_ENV=development
```

### Production (Render Environment Variables)
```
DATABASE_URL=<Internal Database URL from Render>
NODE_ENV=production
# PORT is automatically assigned by Render
# RENDER=true is automatically set
```

## Database Management Scripts

- `schema.sql` - Database schema only
- `setup-render.sql` - Complete setup with schema and data for production
- `import-players.js` - Import player data from JSON files (local development)
- `generate-insert-sql.js` - Generate SQL INSERT statements from JSON data

## Troubleshooting

### Local Issues
- **Port 5432 in use**: PostgreSQL is already running
- **Database doesn't exist**: Run `createdb fantasy_draft_helper`
- **Connection refused**: Start PostgreSQL with `brew services start postgresql@16`

### Render Issues
- **SSL required error**: The app automatically handles SSL for Render connections
- **Connection timeout**: Check that DATABASE_URL uses the Internal URL (not External)
- **Data not showing**: Ensure you ran the setup-render.sql script

## Automatic Environment Detection

The application automatically detects the environment:
- Checks for `RENDER` environment variable (set by Render)
- Checks `NODE_ENV` for production/development
- Configures SSL automatically for Render databases
- Uses appropriate connection string based on environment