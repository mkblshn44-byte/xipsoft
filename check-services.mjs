import { config } from 'dotenv';
config();
import pkg from 'pg';
const { Client } = pkg;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete('channel_binding');
url.searchParams.set('sslmode', 'verify-full');
const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
await client.connect();

const services = await client.query(`SELECT slug, title, row_type, is_active FROM services ORDER BY sort_order ASC`);
console.log('\n=== Servisler ===');
services.rows.forEach(r => console.log(`  ${r.is_active ? 'OK' : 'XX'} [${r.row_type}] ${r.slug}`));

const idx = await client.query(`SELECT row_type, COUNT(*) as cnt FROM service_page_index GROUP BY row_type`);
console.log('\n=== service_page_index ===');
idx.rows.forEach(r => console.log(`  ${r.row_type}: ${r.cnt}`));

const svcRows = await client.query(`SELECT url_slug, service_slug, status FROM service_page_index WHERE row_type = 'service' LIMIT 5`);
console.log('\n=== Örnek service satırları ===');
svcRows.rows.forEach(r => console.log(`  ${r.url_slug} [${r.status}]`));

await client.end();
process.exit(0);
