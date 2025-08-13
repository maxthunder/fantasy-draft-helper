const { Pool } = require('pg');
require('dotenv').config();

// Determine if we're on Render (production) or local
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

// Use Render database URL if available, otherwise use local
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/fantasy_draft_helper';

// Create a connection pool with appropriate SSL settings
const poolConfig = {
  connectionString: connectionString,
  // Render requires SSL, local doesn't
  ssl: isProduction && connectionString.includes('render.com') 
    ? { rejectUnauthorized: false } 
    : false,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

console.log(`Database connecting to: ${connectionString.split('@')[1] || 'local'} (${isProduction ? 'production' : 'development'} mode)`);

const pool = new Pool(poolConfig);

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};