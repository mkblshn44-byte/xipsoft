import { config } from 'dotenv';
config();
import pkg from 'pg';
const { Client } = pkg;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete('channel_binding');
url.searchParams.set('sslmode', 'verify-full');
const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
await client.connect();

console.log('=== TABLOLAR ===');
const tables = await client.query(`
  SELECT table_name, 
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as col_count
  FROM information_schema.tables t
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`);
tables.rows.forEach(r => console.log(`  ${r.table_name} (${r.col_count} kolon)`));

console.log('\n=== VIEW\'LAR ===');
const views = await client.query(`
  SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
`);
views.rows.forEach(r => console.log(`  ${r.table_name}`));

console.log('\n=== SAYFA SAYILARI ===');
const pages = await client.query(`SELECT status, COUNT(*) FROM pages WHERE is_deleted=FALSE GROUP BY status`);
pages.rows.forEach(r => console.log(`  pages [${r.status}]: ${r.count}`));

const services = await client.query(`SELECT is_active, row_type, COUNT(*) FROM services GROUP BY is_active, row_type`);
services.rows.forEach(r => console.log(`  services [active:${r.is_active}, ${r.row_type}]: ${r.count}`));

const locations = await client.query(`SELECT location_type, COUNT(*) FROM locations GROUP BY location_type`);
locations.rows.forEach(r => console.log(`  locations [${r.location_type}]: ${r.count}`));

console.log('\n=== PAGES SLUG ÖRNEKLERİ ===');
const sample = await client.query(`
  SELECT slug, kind, page_type, service_id IS NOT NULL as has_svc, location_id IS NOT NULL as has_loc
  FROM pages WHERE is_deleted=FALSE ORDER BY created_at DESC LIMIT 15
`);
sample.rows.forEach(r => console.log(`  /${r.slug} [${r.kind}] svc:${r.has_svc} loc:${r.has_loc}`));

console.log('\n=== SERVİS ANA SAYFALARI pages\'DA VAR MI? ===');
const svcPages = await client.query(`
  SELECT p.slug, p.status, s.slug as svc_slug
  FROM pages p
  JOIN services s ON s.slug = p.slug
  WHERE p.is_deleted = FALSE AND s.row_type = 'main'
  LIMIT 10
`);
if (svcPages.rows.length === 0) {
  console.log('  YOK — servis ana sayfaları pages tablosunda değil, services tablosunda');
} else {
  svcPages.rows.forEach(r => console.log(`  [${r.status}] ${r.slug}`));
}

await client.end();
process.exit(0);
