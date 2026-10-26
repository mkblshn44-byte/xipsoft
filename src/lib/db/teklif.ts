/**
 * db/teklif — `teklif_requests` + `teklif_events` veri erişimi.
 *
 * Teklif akışının TÜM SQL'i burada toplanır (submit, durum güncelleme,
 * ödeme bildirimi, admin listesi). Şema bootstrap'i de buradadır; `.sql`
 * dosyaları `.vercelignore` ile dağıtımdan çıkarıldığı için tablo/kolonlar
 * ilk yazma işleminde idempotent olarak garanti edilir.
 */

import { query, queryOne } from "./pool";
import {
  buildReferenceCode,
  type Teklif,
  type TeklifEvent,
  type TeklifItem,
  type TeklifStatus,
} from "@/lib/teklif-shared";

const TEKLIF_COLUMNS = `
  id, token, reference_code, name, email, phone, service, detail, status,
  price, payment_method, payment_url, items, paid_at, payment_reported_at,
  created_at, updated_at
`;

interface TeklifRow {
  id: number;
  token: string;
  reference_code: string | null;
  name: string;
  email: string;
  phone: string | null;
  service: string;
  detail: string | null;
  status: string;
  price: string | null;
  payment_method: string | null;
  payment_url: string | null;
  items: TeklifItem[] | string | null;
  paid_at: Date | string | null;
  payment_reported_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseItems(value: TeklifItem[] | string | null): TeklifItem[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as TeklifItem[]) : [];
  } catch {
    return [];
  }
}

function mapRow(row: TeklifRow): Teklif {
  return {
    id: row.id,
    token: row.token,
    reference_code: row.reference_code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    service: row.service,
    detail: row.detail,
    status: row.status as TeklifStatus,
    price: row.price,
    payment_method: row.payment_method,
    payment_url: row.payment_url,
    items: parseItems(row.items),
    paid_at: toIso(row.paid_at),
    payment_reported_at: toIso(row.payment_reported_at),
    created_at: toIso(row.created_at) ?? "",
    updated_at: toIso(row.updated_at) ?? "",
  };
}

// ── Şema bootstrap (idempotent) ──────────────────────────────────────────────

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS teklif_requests (
     id SERIAL PRIMARY KEY,
     token UUID NOT NULL UNIQUE,
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) NOT NULL,
     phone VARCHAR(50),
     service VARCHAR(255) NOT NULL,
     detail TEXT,
     status VARCHAR(50) NOT NULL DEFAULT 'pending',
     price NUMERIC,
     payment_url TEXT,
     payment_method VARCHAR(50),
     items JSONB NOT NULL DEFAULT '[]'::jsonb,
     reference_code VARCHAR(32),
     paid_at TIMESTAMPTZ,
     payment_reported_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   )`,
  `ALTER TABLE teklif_requests ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE teklif_requests ADD COLUMN IF NOT EXISTS reference_code VARCHAR(32)`,
  `ALTER TABLE teklif_requests ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`,
  `ALTER TABLE teklif_requests ADD COLUMN IF NOT EXISTS payment_reported_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS teklif_events (
     id SERIAL PRIMARY KEY,
     teklif_id INTEGER NOT NULL REFERENCES teklif_requests(id) ON DELETE CASCADE,
     status VARCHAR(50) NOT NULL,
     note TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS teklif_events_teklif_id_idx ON teklif_events (teklif_id, created_at)`,
];

let schemaPromise: Promise<void> | null = null;

/** Tabloları/kolonları bir kez garanti eder. Hata durumunda sessizce devam eder. */
export function ensureTeklifSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      if (!process.env.DATABASE_URL) return;
      for (const statement of SCHEMA_STATEMENTS) {
        try {
          await query(statement);
        } catch (err) {
          console.error(
            "[teklif] şema ifadesi uygulanamadı:",
            err instanceof Error ? err.message : err,
          );
        }
      }
    })();
  }
  return schemaPromise;
}

// ── Yazma ───────────────────────────────────────────────────────────────────

export interface CreateTeklifInput {
  token: string;
  name: string;
  email: string;
  phone: string | null;
  service: string;
  detail: string | null;
}

export async function createTeklif(input: CreateTeklifInput): Promise<void> {
  await ensureTeklifSchema();
  await query(
    `INSERT INTO teklif_requests (token, name, email, phone, service, detail, status, reference_code)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
     ON CONFLICT DO NOTHING`,
    [
      input.token,
      input.name,
      input.email,
      input.phone,
      input.service,
      input.detail,
      buildReferenceCode(input.token),
    ],
  );
  await logTeklifEvent(input.token, "pending", "Teklif talebi alındı.");
}

async function logTeklifEvent(
  token: string,
  status: TeklifStatus,
  note: string | null,
): Promise<void> {
  try {
    await query(
      `INSERT INTO teklif_events (teklif_id, status, note)
       SELECT id, $2, $3 FROM teklif_requests WHERE token = $1`,
      [token, status, note],
    );
  } catch (err) {
    console.error("[teklif] olay kaydı yazılamadı:", err instanceof Error ? err.message : err);
  }
}

export interface TeklifPatch {
  status?: TeklifStatus;
  price?: number | null;
  payment_method?: string | null;
  payment_url?: string | null;
  items?: TeklifItem[];
}

/** Admin/akış güncellemesi — her durum değişikliği bir olay kaydı üretir. */
export async function updateTeklif(
  id: number,
  patch: TeklifPatch,
  note?: string | null,
): Promise<Teklif | null> {
  await ensureTeklifSchema();

  const sets: string[] = [];
  const params: unknown[] = [];

  if (patch.status !== undefined) {
    params.push(patch.status);
    sets.push(`status = $${params.length}`);
  }
  if (patch.price !== undefined) {
    params.push(patch.price);
    sets.push(`price = $${params.length}`);
  }
  if (patch.payment_method !== undefined) {
    params.push(patch.payment_method);
    sets.push(`payment_method = $${params.length}`);
  }
  if (patch.payment_url !== undefined) {
    params.push(patch.payment_url);
    sets.push(`payment_url = $${params.length}`);
  }
  if (patch.items !== undefined) {
    params.push(JSON.stringify(patch.items));
    sets.push(`items = $${params.length}::jsonb`);
  }

  if (sets.length === 0) return getTeklifById(id);

  params.push(id);
  const row = await queryOne<TeklifRow>(
    `UPDATE teklif_requests SET ${sets.join(", ")}, updated_at = NOW()
     WHERE id = $${params.length} RETURNING ${TEKLIF_COLUMNS}`,
    params,
  );
  if (!row) return null;

  if (patch.status !== undefined) {
    await logTeklifEvent(row.token, patch.status, note ?? null);
  }
  return mapRow(row);
}

/** Müşteri "havale yaptım" bildirimi — durumu `payment_reported` yapar. */
export async function reportTeklifPayment(
  token: string,
  note?: string | null,
): Promise<Teklif | null> {
  await ensureTeklifSchema();
  const row = await queryOne<TeklifRow>(
    `UPDATE teklif_requests
        SET status = 'payment_reported', payment_reported_at = NOW(), updated_at = NOW()
      WHERE token = $1
      RETURNING ${TEKLIF_COLUMNS}`,
    [token],
  );
  if (!row) return null;
  await logTeklifEvent(token, "payment_reported", note ?? "Havale/EFT bildirimi alındı.");
  return mapRow(row);
}

// ── Okuma ───────────────────────────────────────────────────────────────────

export async function getTeklifByToken(token: string): Promise<Teklif | null> {
  const row = await queryOne<TeklifRow>(
    `SELECT ${TEKLIF_COLUMNS} FROM teklif_requests WHERE token = $1`,
    [token],
  );
  return row ? mapRow(row) : null;
}

export async function getTeklifById(id: number): Promise<Teklif | null> {
  const row = await queryOne<TeklifRow>(
    `SELECT ${TEKLIF_COLUMNS} FROM teklif_requests WHERE id = $1`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function listTeklifler(limit = 200): Promise<Teklif[]> {
  const rows = await query<TeklifRow>(
    `SELECT ${TEKLIF_COLUMNS} FROM teklif_requests
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit],
  );
  return rows.map(mapRow);
}

export async function getTeklifEvents(teklifId: number): Promise<TeklifEvent[]> {
  const rows = await query<{ status: string; note: string | null; created_at: Date | string }>(
    `SELECT status, note, created_at FROM teklif_events
      WHERE teklif_id = $1
      ORDER BY created_at ASC`,
    [teklifId],
  );
  return rows.map((row) => ({
    status: row.status as TeklifStatus,
    note: row.note,
    created_at: toIso(row.created_at) ?? "",
  }));
}
