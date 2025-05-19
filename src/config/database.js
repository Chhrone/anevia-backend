'use strict';

const { Pool } = require('pg');

// PostgreSQL connection configuration
const pool = new Pool({
  user: process.env.DB_USER || 'anevia_admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'anevia_db',
  password: process.env.DB_PASSWORD || 'anevia',
  port: process.env.DB_PORT || 5432,
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected successfully');
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
