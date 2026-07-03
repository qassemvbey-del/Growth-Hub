const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: '2a05:d018:5b7:f200:7c5a:f933:d6c1:e8f7',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Successfully connected with password: postgres');
    await client.end();
  } catch (e) {
    console.error('Failed to connect with password: postgres. Error:', e.message);
  }
}

check();
