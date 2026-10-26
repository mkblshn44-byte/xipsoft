/**
 * restore-neon-dump.ts — SQL dump'ını (şema + veri) hedef Neon veritabanına
 * KAYIPLA-GUVENLI yükler.
 *
 * Neden `psql -f` yok: bu makinede psql kurulu değil (pg_dump/psql ikilisi yok).
 *
 * Üç koruma katmanı:
 *  1. Hedefte ZATEN VAR olan tablo tamamen atlanır (DDL + INSERT). Yani dolu bir
 *     DB'ye çalıştırmak oradaki veriyi ezmez; boş DB'ye çalıştırmak her şeyi kurar.
 *  2. `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS` olarak yeniden yazılır.
 *  3. Yalnizca `--yes` ile yazar; varsayilan plani yazdirir (dry-run).
 *
 * Dump'taki `DEFAULT nextval('x_id_seq'::regclass)` ifadeleri DDL'den ÖNCE seq
 * olusturmayi gerektirir — dump CREATE SEQUENCE içermiyor, aksi halde her
 * `CREATE TABLE` "relation x_id_seq does not exist" ile düserdi.
 *
 * INSERT'ler tabilo başina ~150'lik paketlerle tek sorguda gönderilir: 7.901
 *statement'i tek tek dolasin Turkey→us-east-2 RTT'siyle ~20 dk sürerdi.
 *
 * Kullanim:
 *   node_modules\.bin\tsx.cmd --env-file=.env.local src/scripts/restore-neon-dump.ts --dump=<yol>
 *   ... ayni komuta --yes ekleyince gercekten yazar.
 */
import { readFileSync } from "node:fs";
import { Pool } from "pg";

type Stmt = { sql: string; table: string | null };

function env(key: string): string {
  for (const file of [".env.local", ".env.production.local", ".env"]) {
    try {
      const m = readFileSync(file, "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
      if (m) {
        const v = m[1].trim().replace(/^["']|["']$/g, "");
        if (v && !v.includes("[SENSITIVE]")) return v;
      }
    } catch {
      /* dosya yok — devam */
    }
  }
  return process.env[key] ?? "";
}

const args = process.argv.slice(2);
const flag = (name: string): boolean => args.includes(`--${name}`);
const opt = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const dumpPath = opt("dump");
if (!dumpPath) {
  console.error("Kullanim: restore-neon-dump.ts --dump=<sql-yolu> [--tables=a,b] [--yes]");
  process.exit(2);
}
const WRITE = flag("yes");
// Hedefte 0 satırlık "kalıntı" tablo varsa DROP + yeniden kur; satırı olan hiçbir tabloya dokunulmaz.
const RECREATE_EMPTY = flag("recreate-empty");
// Açıkça isimlendirilen tablolar satır içersin diye DROP edilir — tek kullanım yolu CLI'dan liste vermek.
const RECREATE = new Set(opt("recreate")?.split(",").map((s) => s.trim()).filter(Boolean) ?? []);
const BATCH = Number(opt("batch") ?? 150);
const only = opt("tables")?.split(",").map((s) => s.trim()).filter(Boolean);
const exclude = new Set(opt("exclude")?.split(",").map((s) => s.trim()).filter(Boolean) ?? []);

/**
 * Tirnak/dollar-quote yorumu bilen ayirici: tek satira yayilmis (içinde `;` ve
 * newline olan jsonb icerikli) INSERT'lari dogru sinirlamak için şart.
 */
function splitStatements(raw: string): string[] {
  const out: string[] = [];
  let buf = "";
  let i = 0;
  const n = raw.length;
  while (i < n) {
    const ch = raw[i];
    const two = raw.slice(i, i + 2);
    if (two === "--") {
      while (i < n && raw[i] !== "\n") i++;
      continue;
    }
    if (two === "/*") {
      const end = raw.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const q = ch;
      buf += ch;
      i++;
      while (i < n) {
        if (raw[i] === "\\" && q === "'") {
          buf += raw.slice(i, i + 2);
          i += 2;
          continue;
        }
        if (raw[i] === q) {
          if (raw[i + 1] === q) {
            buf += q + q;
            i += 2;
            continue;
          }
          buf += q;
          i++;
          break;
        }
        buf += raw[i++];
      }
      continue;
    }
    const dollar = /^\$([A-Za-z_0-9]*)\$/.exec(raw.slice(i));
    if (dollar) {
      const tag = dollar[0];
      const end = raw.indexOf(tag, i + tag.length);
      const stop = end === -1 ? n : end + tag.length;
      buf += raw.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === ";") {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = "";
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

/** Dump'taki `-- N rows` imzalarindan beklenti haritasi (yalnizca rapor için). */
function expectedRows(raw: string): Map<string, number> {
  const map = new Map<string, number>();
  let current: string | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const t = /^-- Table: (\S+)$/.exec(line);
    if (t) {
      current = t[1];
      map.set(current, 0);
      continue;
    }
    const r = /^-- (\d+) rows?$/.exec(line);
    if (r && current) map.set(current, Number(r[1]));
  }
  return map;
}

function tableOf(sql: string): string | null {
  const m =
    /^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/i.exec(sql) ??
    /^\s*INSERT\s+INTO\s+"?([A-Za-z0-9_]+)"?/i.exec(sql);
  return m ? m[1] : null;
}

function sequencesIn(sql: string): string[] {
  return [...sql.matchAll(/nextval\('([A-Za-z0-9_]+)'::regclass\)/g)].map((m) => m[1]);
}

/**
 * Dump'ı üreten script array kolonlarını `kolon ARRAY` diye yazmış — Postgres
 * tek başına `ARRAY` tipini kabul etmez ("syntax error at or near ARRAY").
 * Hepsinin elemanı text (`'{}'::text[]`, `ARRAY['/x/'::text, …]`), o yüzden
 * text[]'e çevrilir. `DEFAULT ARRAY[` içindeki ARRAY izleme boşlukla bitmediği
 * için (front-lookahead `[`'yi dışarıda tutar) korunur.
 *
 * Aynı dump'ta iki kusur daha aynı fonksiyonda kapatılır:
 * - `uuid_generate_v4()` pgcrypto istemezse yoktur → built-in gen_random_uuid().
 * - `order integer` rezerve kelime olduğu için tanımlanama­z → tırnaklanır.
 */
function fixDdlTypes(sql: string): string {
  return sql
    .replace(/\bARRAY\b(?=\s*(?:,|\)|DEFAULT|NOT NULL|NULL))/g, "text[]")
    .replace(/\buuid_generate_v4\(\)/g, "gen_random_uuid()")
    .replace(/(^|[(,\s])order(?=\s+(?:integer|smallint|bigint|text|character|boolean|timestamp|jsonb|numeric|double|real|uuid)\b)/g, '$1"order"');
}

/** Tek satır SQL literali → ham metin ('' kaçışı ve E'' biçimi çözülür). */
function unquoteSqlString(lit: string): string | null {
  const isEscape = /^E'/.test(lit);
  const body = isEscape ? lit.slice(2, -1) : lit.startsWith("'") ? lit.slice(1, -1) : null;
  if (body === null) return null;
  return isEscape ? body.replace(/\\'/g, "'").replace(/\\\\/g, "\\") : body.replace(/''/g, "'");
}

/** Ham metin → SQL single-quote literali (standard_conforming_strings=on varsayımı). */
function quoteSqlString(raw: string): string {
  return `'${raw.replace(/'/g, "''")}'`;
}

/**
 * Dump, text[] kolon değerlerini JSON biçiminde yazıyor (`'["a","b"]'`) ama
 * Postgres array literali `{"a","b"}` bekler. Sadece array kolon pozisyonlarında
 * çağrılır; jsonb kolonlara dokunulmaz, o yüzden `'[]'`::jsonb verileri bozulmaz.
 */
function jsonToPgArrayLiteral(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const body = parsed
    .map((el) => (el === null ? "NULL" : `"${String(el).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`))
    .join(",");
  return `{${body}}`;
}

/**
 * DDL'den kolon sırasını ve text[] olanların indekslerini çıkarır — INSERT'lerde
 * kolon adı verilmediği için pozisyon eşlemesi şart.
 */
function columnFixSpec(ddlSql: string): { arrays: number[]; jsonb: number[] } {
  const inner = ddlSql.slice(ddlSql.indexOf("(") + 1, ddlSql.lastIndexOf(")"));
  const cols = splitTopLevel(inner, ",");
  const arrays: number[] = [];
  const jsonb: number[] = [];
  cols.forEach((c, i) => {
    if (/^\s*"?[A-Za-z_0-9]+"?\s+(?:ARRAY|text\[\])/i.test(c)) arrays.push(i);
    else if (/^\s*"?[A-Za-z_0-9]+"?\s+jsonb\b/i.test(c)) jsonb.push(i);
  });
  return { arrays, jsonb };
}

/** Ayraç/dize/parantez durumunu bilen bölücü; çok satırlı jsonb içerikli INSERT'ler için. */
function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      buf += ch;
      if (ch === "\\" && quote === "'") {
        buf += s[++i] ?? "";
        continue;
      }
      if (ch === quote && s[i + 1] === quote) {
        buf += s[++i];
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === sep && depth === 0) {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim() !== "") out.push(buf);
  return out;
}

/**
 * Dump üreticisinin iki kusurunu INSERT seviyesinde onarır:
 * - text[] kolonlar JSON biçiminde yazılmış (`'["a","b"]'`) → `{"a","b"}`.
 * - jsonb kolona düşen düz metin (markdown gibi) JSON'a sarılmamış → sarılır;
 *   uygulama string içeriği destekliyor (src/lib/blog/content.ts:11).
 * Yalnızca ilgili kolon pozisyonlarında çalışır, bu yüzden `'[]'::jsonb` gibi
 * doğru verilere dokunulmaz.
 */
function fixInsertValues(insertSql: string, spec: { arrays: number[]; jsonb: number[] }): string {
  if (!spec.arrays.length && !spec.jsonb.length) return insertSql;
  const head = /^\s*INSERT\s+INTO\s+[A-Za-z_0-9]+\s+VALUES\s*\(/i.exec(insertSql);
  if (!head) return insertSql;
  const start = head[0].length;
  const end = insertSql.lastIndexOf(")");
  const elements = splitTopLevel(insertSql.slice(start, end), ",");
  if (elements.length < Math.max(...[...spec.arrays, ...spec.jsonb]) + 1) return insertSql;
  let changed = false;
  const rewrite = (pos: number, next: string | null): void => {
    if (next === null) return;
    const raw = elements[pos].trimStart();
    elements[pos] = elements[pos].slice(0, elements[pos].indexOf(raw)) + next;
    changed = true;
  };
  for (const pos of spec.arrays) {
    const el = elements[pos].trimStart();
    if (!el.startsWith("'[") && !el.startsWith("E'[")) continue;
    const raw = unquoteSqlString(el);
    const literal = raw === null ? null : jsonToPgArrayLiteral(raw);
    rewrite(pos, literal === null ? null : quoteSqlString(literal));
  }
  for (const pos of spec.jsonb) {
    const el = elements[pos].trimStart();
    if (!el.startsWith("'") && !el.startsWith("E'")) continue;
    const raw = unquoteSqlString(el);
    if (raw === null) continue;
    try {
      JSON.parse(raw);
    } catch {
      rewrite(pos, quoteSqlString(JSON.stringify(raw)));
    }
  }
  return changed ? `${insertSql.slice(0, start)}${elements.join(",")}${insertSql.slice(end)}` : insertSql;
}

const connectionString = env("DATABASE_URL");
if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
  console.error("✖ Geçerli DATABASE_URL yok — .env.local içindeki hedef Neon yanlış/boş.");
  process.exit(2);
}

const raw = readFileSync(dumpPath, "utf8");
const statements = splitStatements(raw);
const expected = expectedRows(raw);

const ddl = new Map<string, string>();
const inserts = new Map<string, string[]>();
const skippedTables = new Set<string>();
const orphan: string[] = [];

for (const sql of statements) {
  const table = tableOf(sql);
  if (!table) {
    orphan.push(sql.slice(0, 60));
    continue;
  }
  if (only && !only.includes(table)) continue;
  if (exclude.has(table)) {
    skippedTables.add(table);
    continue;
  }
  if (/^\s*CREATE\s+TABLE/i.test(sql)) {
    ddl.set(
      table,
      /^\s*CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/i.test(sql) ? sql : sql.replace(/^\s*CREATE\s+TABLE\s+/i, "CREATE TABLE IF NOT EXISTS "),
    );
  } else {
    inserts.set(table, [...(inserts.get(table) ?? []), sql]);
  }
}

const targetHost = (() => {
  try {
    return new URL(connectionString).hostname.split(".")[0];
  } catch {
    return "?";
  }
})();

console.log(`Hedef DB      : ${targetHost}`);
console.log(`Dump          : ${dumpPath} (${(raw.length / 1048576).toFixed(1)} MB, ${statements.length} statement)`);
console.log(`Mod           : ${WRITE ? "YAZMA (--yes)" : "DRY-RUN (plan)"}\n`);

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, statement_timeout: 120_000 });

// tsx bu dosyayi CJS olarak derliyor (package.json'da "type" yok) → top-level await kullanilamaz.
async function run(): Promise<void> {
  const client = await pool.connect();
  try {
  const existingRes = await client.query(
    "select table_name from information_schema.tables where table_schema='public'",
  );
  const existing = new Set(existingRes.rows.map((r) => r.table_name as string));

  const existingCounts = new Map<string, number>();
  for (const table of existing) {
    if (!ddl.has(table)) continue;
    const c = await client.query(`select count(*)::int as n from "${table}"`);
    existingCounts.set(table, c.rows[0].n as number);
  }

  const plan: string[] = [];
  const toCreate: string[] = [];
  const recreate = new Set<string>();
  for (const table of ddl.keys()) {
    if (!existing.has(table)) {
      toCreate.push(table);
      plan.push(`KUR+YUKLE ${table.padEnd(28)} ${expected.get(table) ?? 0} satir (beklenen)`);
      continue;
    }
    const n = existingCounts.get(table) ?? 0;
    if (RECREATE.has(table) || (n === 0 && RECREATE_EMPTY)) {
      toCreate.push(table);
      recreate.add(table);
      plan.push(`BOS-KALINTI ${table.padEnd(24)} 0 satir → DROP + yeniden kur`);
      continue;
    }
    plan.push(
      `ATLA  ${table.padEnd(28)} hedefte zaten var (${n} satir)${
        (inserts.get(table)?.length ?? 0) ? ` — ${inserts.get(table)!.length} INSERT de atlanacak` : ""
      }`,
    );
  }
  const seqTargets = new Set<string>();
  for (const t of toCreate) sequencesIn(ddl.get(t)!).forEach((s) => seqTargets.add(s));
  console.log(plan.join("\n"));
  console.log(`\nOluşturulacak sequence: ${[...seqTargets].length}`);
  if (orphan.length) console.log(`DDL/INSERT dışı statement (atlandı): ${orphan.length} → ${orphan.slice(0, 3).join(" | ")}`);
  if (skippedTables.size) console.log(`--exclude ile atlanan: ${[...skippedTables].join(", ")}`);

  if (!WRITE) {
    console.log("\nDRY-RUN: hedefe hiçbir şey yazılmadı. Onay için --yes ekle.");
    process.exitCode = 0;
  } else {
    for (const seq of seqTargets) {
      await client.query(`CREATE SEQUENCE IF NOT EXISTS "${seq}"`);
    }
    const created: string[] = [];
    for (const table of toCreate) {
      if (recreate.has(table)) await client.query(`DROP TABLE "${table}"`);
      try {
        await client.query(fixDdlTypes(ddl.get(table)!));
        created.push(table);
      } catch (err) {
        console.error(`✖ ${table} CREATE TABLE başarısız: ${(err as Error).message.slice(0, 160)}`);
        process.exitCode = 1;
      }
    }

    let totalInserted = 0;
    const failures: string[] = [];
    const report: { table: string; expected: number; actual: number; ok: boolean }[] = [];
    for (const table of created) {
      const spec = columnFixSpec(ddl.get(table)!);
      const rows = (inserts.get(table) ?? []).map((s) => fixInsertValues(s, spec));
      let done = 0;
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        await client.query("BEGIN");
        try {
          await client.query(chunk.join(";\n") + ";");
          await client.query("COMMIT");
          done += chunk.length;
        } catch (err) {
          await client.query("ROLLBACK");
          // Paketi tek tek dene: hangi satırın bozuk olduğunu tam olarak söyleyelim,
          // sağlam satırlar kaybolsun istemiyoruz.
          console.warn(`! ${table} paket ${i / BATCH + 1} toplu girilemedi (${(err as Error).message.slice(0, 120)}) → tek tek deneniyor`);
          for (const sql of chunk) {
            try {
              await client.query(sql);
              done++;
            } catch (rowErr) {
              const e = rowErr as { message?: string; detail?: string };
              failures.push(`${table}: ${sql.slice(0, 140).replace(/\s+/g, " ")}\n    → ${e.message?.slice(0, 120)}${e.detail ? ` | ${e.detail.slice(0, 120)}` : ""}`);
            }
          }
        }
      }
      totalInserted += done;
      const seqName = `${table}_id_seq`;
      const hasSeq = seqTargets.has(seqName);
      if (hasSeq && done) {
        const r = await client.query(`select column_name from information_schema.columns where table_name=$1 and column_name='id'`, [table]);
        if (r.rowCount) await client.query(`select setval('${seqName}', (select coalesce(max(id),1) from "${table}"), true)`);
      }
      const cnt = await client.query(`select count(*)::int as n from "${table}"`);
      const exp = expected.get(table) ?? 0;
      report.push({ table, expected: exp, actual: cnt.rows[0].n, ok: cnt.rows[0].n === exp });
      const pad = " ".repeat(Math.max(1, 28 - table.length));
      console.log(`${cnt.rows[0].n === exp ? "✓" : "!"} ${table}${pad} beklenen ${exp} → gercek ${cnt.rows[0].n}`);
    }
    console.log(`\nToplam INSERT: ${totalInserted} | tablo: ${created.length}`);
    if (failures.length) {
      console.error(`✖ ${failures.length} satır girilemedi (ilk 15):`);
      failures.slice(0, 15).forEach((f) => console.error("  " + f));
      process.exitCode = 1;
    }
    const bad = report.filter((r) => !r.ok);
    if (bad.length) {
      console.error(`✖ Eşleşmeyen ${bad.length} tablo: ${bad.map((b) => `${b.table} (${b.actual}/${b.expected})`).join(", ")}`);
      process.exitCode = 1;
    } else {
      console.log("✓ Tüm tablolar beklenen satır sayısıyla eşleşti.");
    }
  }
  } finally {
    client.release();
  }
  await pool.end();
}

run().catch((err) => {
  console.error("✖ Script başarısız:", (err as Error).message);
  process.exit(1);
});
