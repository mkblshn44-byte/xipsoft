/**
 * Database pool — dual pool, load balanced + failover
 * Primary: Neon (DATABASE_URL)
 * Secondary: Supabase (DATABASE_URL_SECONDARY)
 *
 * Bu dosya YALNIZCA bağlantı havuzu yönetiminden sorumludur:
 *   - Pool oluşturma / health-check / retry
 *   - Read/write routing (primary + secondary)
 *   - `pool` proxy (drop-in replacement) + query/queryOne/transaction yardımcıları
 *
 * Domain sorguları ayrı dosyalardadır (services, service-city, references, …).
 */

import { Pool } from "pg";

// ── Pool ─────────────────────────────────────────────────────────────────────

export interface PoolHealth {
  healthy: boolean;
  consecutiveFailures: number;
  totalQueries: number;
  failedQueries: number;
  avgLatency: number;
}

/**
 * Pool sağlık metriklerini günceller — `DBPool` ve `MockPool` ortak (D1).
 * Başarısızlıkta 3 ardışık hatada sağlıksız işaretlenir; `logLabel` verilirse
 * yalnızca ilk işaretlemede log düşer (mock sessiz kalır).
 */
function applyHealthUpdate(
  health: PoolHealth,
  latency: number,
  success: boolean,
  logLabel?: string,
): void {
  health.totalQueries++;
  if (success) {
    health.consecutiveFailures = 0;
    health.healthy = true;
    health.avgLatency =
      health.avgLatency === 0
        ? latency
        : health.avgLatency * 0.9 + latency * 0.1;
    return;
  }

  health.failedQueries++;
  health.consecutiveFailures++;
  if (health.consecutiveFailures === 3) {
    health.healthy = false;
    if (logLabel) {
      console.error(
        `[DB:${logLabel}] Marked unhealthy after ${health.consecutiveFailures} failures`,
      );
    }
  } else if (health.consecutiveFailures > 3) {
    health.healthy = false;
  }
}

/** Sağlık + bağlantı sayılarından ortak `getStats()` snapshot'ı (D2). */
function statsSnapshot(
  name: string,
  health: PoolHealth,
  counts: { total: number; idle: number; waiting: number },
) {
  return {
    name,
    healthy: health.healthy,
    total: counts.total,
    idle: counts.idle,
    waiting: counts.waiting,
    avgLatency: `${health.avgLatency.toFixed(1)}ms`,
    totalQueries: health.totalQueries,
    failedQueries: health.failedQueries,
  };
}

class DBPool {
  pool: Pool;
  name: string;
  health: PoolHealth = {
    healthy: true, consecutiveFailures: 0,
    totalQueries: 0, failedQueries: 0, avgLatency: 0,
  };

  constructor(connectionString: string, name: string) {
    this.name = name;

    // SSL uyarısını önlemek için sslmode=verify-full ekle veya mevcut sslmode'u değiştir
    let finalConnectionString = connectionString;
    if (finalConnectionString) {
      if (finalConnectionString.includes('sslmode=')) {
        // Mevcut sslmode'u verify-full ile değiştir
        finalConnectionString = finalConnectionString.replace(/sslmode=[^&]+/, 'sslmode=verify-full');
      } else {
        // Yeni sslmode ekle
        finalConnectionString += finalConnectionString.includes('?') ? '&sslmode=verify-full' : '?sslmode=verify-full';
      }
    }
    
    const ssl = process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: process.env.NODE_ENV === 'production' };

    this.pool = new Pool({
      connectionString: finalConnectionString,
      // Serverless instance başına bağlantı sayısını sınırla; birden çok warm
      // instance toplamda sağlayıcı bağlantı limitini aşmamalı.
      // Artırıldı: 5 -> 10 (Neon free tier 100 conn, multiple instances için yeterli)
      max: 10,
      min: 2, // Min 2 bağlantı tut - cold start önleme
      idleTimeoutMillis: 60000, // 30s -> 60s: sık yeniden bağlanma maliyetini azalt
      connectionTimeoutMillis: 5000, // 3s -> 5s: geçici ağ gecikmelerinde tolerans
      statement_timeout: 15000, // 8s -> 15s: karmaşık sorgular için daha geniş zaman
      ssl: ssl as any,
      application_name: `xipsoft-${name}`,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // Connection validation - bozuk bağlantıları erken tespit et
      allowExitOnIdle: false,
    });
    this.pool.on("error", (err) => {
      console.error(`[DB:${name}] Pool error:`, err.message);
      this.health.healthy = false;
    });
    this.pool.on("connect", () => {
      this.health.healthy = true;
      this.health.consecutiveFailures = 0;
    });
  }

  updateStats(latency: number, success: boolean) {
    applyHealthUpdate(this.health, latency, success, this.name);
  }

  async testConnection(): Promise<boolean> {
    try {
      const t = Date.now();
      await this.pool.query('SELECT 1');
      // Startup probe — directly mark healthy without going through updateStats
      this.health.healthy = true;
      this.health.consecutiveFailures = 0;
      this.health.avgLatency = Date.now() - t;
      return true;
    } catch {
      // Startup probe failed — mark unhealthy silently (no console.error spam)
      this.health.healthy = false;
      this.health.consecutiveFailures = 3; // skip the 1-2 failure window
      return false;
    }
  }

  getStats() {
    return statsSnapshot(this.name, this.health, {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    });
  }
}

class MockPool {
  name: string;
  pool: this;
  health: PoolHealth = {
    healthy: false,
    consecutiveFailures: 0,
    totalQueries: 0,
    failedQueries: 0,
    avgLatency: 0,
  };

  constructor(name: string) {
    this.name = name;
    this.pool = this;
  }

  updateStats(latency: number, success: boolean) {
    applyHealthUpdate(this.health, latency, success);
  }

  async query(_query: any, _params?: any) {
    this.updateStats(0, true);
    return { rows: [], rowCount: 0, command: 'SELECT' };
  }

  async connect() {
    return {
      release: () => undefined,
      query: this.query.bind(this),
      on: () => undefined,
    } as any;
  }

  async end() {
    return;
  }

  getStats() {
    return statsSnapshot(this.name, this.health, { total: 0, idle: 0, waiting: 0 });
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────

let primary: DBPool | MockPool;
let secondary: DBPool | null = null;
let initialized = false;
let initError: Error | null = null;
let healthInterval: NodeJS.Timeout | null = null;
let readCounter = 0;
let _primaryConnectedLogged = false; // ✅ Connected sadece bir kez bassın

const initPromise = (() => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    primary = new MockPool('primary');
    initialized = true;
    return Promise.resolve();
  }
  return (async () => {
    try {
      const url = process.env.DATABASE_URL;
      if (!url) {
        primary = new MockPool('primary');
        initError = new Error('DATABASE_URL is not set; using mock database fallback');
        console.warn('[DB:primary] DATABASE_URL is not set — using mock DB fallback');
      } else {
        primary = new DBPool(url, 'primary');
        const ok = await primary.testConnection();
        if (!ok) {
          initError = new Error('Primary DB connection failed health check');
          console.warn('[DB:primary] ⚠️ No database connection on startup — running without DB');
        } else {
          if (!_primaryConnectedLogged) {
            if (process.env.NODE_ENV !== 'production') console.log('[DB:primary] ✅ Connected');
            _primaryConnectedLogged = true;
          }
        }

        const url2 = process.env.DATABASE_URL_SECONDARY;
        if (url2) {
          secondary = new DBPool(url2, 'secondary');
          const ok2 = await secondary.testConnection();
          if (ok2) {
            if (process.env.NODE_ENV !== 'production') console.log('[DB:secondary] ✅ Connected');
          } else {
            console.warn('[DB:secondary] ⚠️ Unhealthy on startup, will retry');
          }
        }

        healthInterval = setInterval(async () => {
          for (const db of [primary, secondary].filter(Boolean) as DBPool[]) {
            const t = Date.now();
            try {
              await db.pool.query('SELECT 1');
              const wasUnhealthy = !db.health.healthy;
              db.health.healthy = true;
              db.health.consecutiveFailures = 0;
              db.health.avgLatency = (db.health.avgLatency * 0.9) + ((Date.now() - t) * 0.1);
              if (wasUnhealthy) {
                console.log(`[DB:${db.name}] ✅ Recovered`);
              }
            } catch (err: any) {
              const wasHealthy = db.health.healthy;
              db.health.healthy = false;
              if (wasHealthy) console.warn(`[DB:${db.name}] ⚠️ Health check failed:`, err.message);
            }
          }
        }, 30000);
        healthInterval.unref();
      }
    } catch (err) {
      initError = err instanceof Error ? err : new Error(String(err));
      console.error('[DB] ❌ Init failed:', initError.message);
    } finally {
      initialized = true;
    }
  })();
})();

// ── Router ───────────────────────────────────────────────────────────────────

function isDBPool(pool: DBPool | MockPool): pool is DBPool {
  return pool instanceof DBPool;
}

function getReadPool(): DBPool | MockPool {
  const pools = [primary, secondary].filter((p): p is DBPool => !!p && p.health.healthy);
  if (pools.length === 0) return primary;
  const idx = readCounter++ % pools.length;
  return pools[idx] ?? primary;
}

function getWritePool(): DBPool | MockPool {
  return primary;
}

function isWriteQuery(sql: string): boolean {
  const normalized = sql.trim().toUpperCase();
  return /^(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|BEGIN|COMMIT|ROLLBACK)/.test(normalized);
}

// ── Proxy (default export — drop-in replacement) ──────────────────────────────

// Retry configuration for transient failures
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 100;
const RETRY_MAX_DELAY_MS = 2000;

function isTransientError(error: any): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? '';
  const code = error.code?.toLowerCase() ?? '';
  // Common transient PostgreSQL/Neon errors
  return (
    code === 'econnreset' ||
    code === 'etimedout' ||
    code === 'econnrefused' ||
    code === '57p01' || // admin_shutdown
    code === '57p02' || // crash_shutdown
    code === '57p03' || // cannot_connect_now
    code === '08006' || // connection_failure
    code === '08001' || // sqlclient_unable_to_establish_sqlconnection
    message.includes('timeout') ||
    message.includes('connection terminated') ||
    message.includes('connection reset') ||
    message.includes('eof') ||
    message.includes('socket') ||
    message.includes('temporarily unavailable')
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryWithRetry(
  pool: { query: (text: string, params?: any[]) => Promise<any> },
  sql: string,
  params: any[],
  attempt = 1,
): Promise<{ rows: any[]; rowCount: number | null; command: string }> {
  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (err: any) {
    // Don't retry on last attempt or non-transient errors
    if (attempt >= MAX_RETRIES || !isTransientError(err)) {
      throw err;
    }
    // Exponential backoff with jitter
    const delay = Math.min(
      RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 100,
      RETRY_MAX_DELAY_MS,
    );
    console.warn(`[DB] Transient error (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms:`, err.message);
    await sleep(delay);
    return queryWithRetry(pool, sql, params, attempt + 1);
  }
}

const pool = new Proxy({} as Pool, {
  get(_t, prop) {
    return async (...args: any[]) => {
      if (!initialized) await initPromise;
      if (!primary) throw new Error('[DB] Not initialized');

      if (prop === 'query') {
        const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text ?? '';
        const target = isWriteQuery(sql) ? getWritePool() : getReadPool();

        // Mock DB (DATABASE_URL yok): boş dön — gerçek pool'da "unhealthy" olsa bile sorguyu dene;
        // aksi halde geçici kesinti sonrası tüm SELECT'ler sessizce boş kalır ve UI "içerik yok" gösterir.
        if (!primary.health.healthy && !isDBPool(primary)) {
          return { rows: [], rowCount: 0, command: 'SELECT' };
        }

        const t = Date.now();
        try {
          // Use retry logic for all queries - handle both DBPool and MockPool
          const targetPool = isDBPool(target) ? target.pool : target;
          const result = await queryWithRetry(targetPool, sql, args[1] ?? []);
          target.updateStats(Date.now() - t, true);
          return result;
        } catch (err) {
          target.updateStats(Date.now() - t, false);
          if (target !== primary && isDBPool(target)) {
            console.warn(`[DB:${target.name}] Read failed, falling back to primary`);
            // Only fallback if primary is healthy
            if (primary.health.healthy) {
              try {
                const result = await queryWithRetry(primary.pool, sql, args[1] ?? []);
                primary.updateStats(Date.now() - t, true);
                return result;
              } catch (err2) {
                primary.updateStats(Date.now() - t, false);
                throw err2;
              }
            }
          }
          throw err;
        }
      }

      if (prop === 'connect') {
        return getWritePool().pool.connect();
      }

      const method = (getWritePool().pool as any)[prop];
      if (typeof method === 'function') return method.apply(getWritePool().pool, args);
      throw new Error(`[DB] Method ${String(prop)} not available`);
    };
  },
});

export default pool;

// ══════════════════════════════════════════════════════════════════════════════
// Query Helpers (formerly db-utils)
// ══════════════════════════════════════════════════════════════════════════════

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
