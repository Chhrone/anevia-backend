'use strict';

const { pool } = require('./src/config/database');

async function checkDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Query all scans
    const result = await pool.query('SELECT * FROM scans ORDER BY scan_date DESC');
    
    console.log(`Found ${result.rows.length} scan records:`);
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Close the connection
    await pool.end();
    
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error querying database:', error);
  }
}

// Run the function
checkDatabase();
