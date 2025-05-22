const { Pool } = require('pg');
require('dotenv').config();

// Konfigurasi koneksi
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Fungsi untuk memeriksa apakah sebuah tabel ada di skema public
async function checkTableExists(tableName) {
  const client = await pool.connect();

  try {
    const res = await client.query(
      `SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = $1
      );`,
      [tableName]
    );

    const exists = res.rows[0].exists;
    console.log(`Tabel '${tableName}' ${exists ? 'ditemukan' : 'TIDAK ditemukan'} di database.`);
    return exists;
  } catch (err) {
    console.error(`Terjadi kesalahan saat mengecek tabel '${tableName}':`, err.message);
    return false;
  } finally {
    client.release();
  }
}

// Jalankan pengecekan untuk beberapa tabel
async function main() {
  const tablesToCheck = ['users', 'scans']; // tambahkan tabel lain jika perlu

  for (const table of tablesToCheck) {
    await checkTableExists(table);
  }

  // Tutup koneksi pool setelah selesai
  await pool.end();
}

// Jalankan
main();