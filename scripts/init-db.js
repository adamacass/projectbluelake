require('dotenv').config();
const { initDB, pool } = require('../db');

async function main() {
  try {
    await initDB();
    console.log('[init-db] Database initialized successfully');
  } catch (err) {
    console.error('[init-db] Failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
