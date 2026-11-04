import { config } from 'dotenv';
config();
import pkg from 'pg';
const { Client } = pkg;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete('channel_binding');
url.searchParams.set('sslmode', 'verify-full');
const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
await client.connect();

// Mevcut pages yapısı
const cols = await client.query(`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'pages'
  ORDER BY ordinal_position
`);
console.log('=== pages kolonları ===');
cols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

// kind dağılımı
const kinds = await client.query(`
  SELECT kind, status, COUNT(*) FROM pages
  WHERE is_deleted = FALSE
  GROUP BY kind, status ORDER BY kind
`);
console.log('\n=== kind dağılımı ===');
kinds.rows.forEach(r => console.log(`  [${r.kind}] ${r.status}: ${r.count}`));

// Örnek slug'lar
const sample = await client.query(`
  SELECT slug, kind, status, service_id, location_id
  FROM pages WHERE is_deleted = FALSE
  ORDER BY created_at DESC LIMIT 10
`);
console.log('\n=== Son 10 sayfa ===');
sample.rows.forEach(r => console.log(`  ${r.slug} [${r.kind}/${r.status}] svc:${r.service_id} loc:${r.location_id}`));

await client.end();
process.exit(0);
