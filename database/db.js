const { Pool } = require('pg');
require('dotenv').config();

// Determine if we're on Render (production) or local
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

// Use provided PostgreSQL database URL
const connectionString = process.env.DATABASE_URL || 'postgresql://fantasy_draft_helper_db_user:ULTm9paCMulpzCtNzfcNIenagC7sofEN@dpg-d2dtsqmmcj7s73db9v20-a.oregon-postgres.render.com/fantasy_draft_helper_db';

// Create a connection pool with appropriate SSL settings
const poolConfig = {
  connectionString: connectionString,
  // Render requires SSL
  ssl: connectionString.includes('render.com') 
    ? { rejectUnauthorized: false } 
    : false,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

console.log(`Database connecting to: ${connectionString.split('@')[1] || 'local'} (${isProduction ? 'production' : 'development'} mode)`);

const pool = new Pool(poolConfig);

// Track database availability
let isDatabaseAvailable = false;

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
  isDatabaseAvailable = true;
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  isDatabaseAvailable = false;
  // Don't exit the process, allow fallback to JSON
});

// Test initial connection
pool.query('SELECT 1')
  .then(() => {
    isDatabaseAvailable = true;
    console.log('Database connection verified');
  })
  .catch((err) => {
    isDatabaseAvailable = false;
    console.error('Database connection failed, will use JSON fallback:', err.message);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  isDatabaseAvailable: () => isDatabaseAvailable
};
