const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Connected to database successfully');
    
    // Coba query sederhana
    const res = await client.query('SELECT NOW()');
    console.log('Database time:', res.rows[0]);
    
    // Cek apakah tabel scans ada
    try {
      const tablesRes = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'scans'
        );
      `);
      console.log('Table "scans" exists:', tablesRes.rows[0].exists);
      
      if (tablesRes.rows[0].exists) {
        // Cek struktur tabel
        const columnsRes = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'scans';
        `);
        console.log('Table structure:', columnsRes.rows);
      }
    } catch (err) {
      console.error('Error checking table:', err);
    }
    
    client.release();
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    pool.end();
  }
}

testConnection();