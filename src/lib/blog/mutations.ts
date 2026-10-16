/**
 * blog/mutations.ts — Post tabloları için ortak mutasyon işlemleri.
 *
 * Actions bu fonksiyonları kullanır; doğrudan pool'a bağımlı değildir.
 * Tablo adı beyaz liste ile doğrulanır (SQL injection koruması).
 */

import pool from "@/lib/database";

/** Mutasyon yapılabilen tablolar — SQL injection koruması (tek casing: `blog_posts`). */
const ALLOWED_TABLES = ['blog_posts'] as const;

/** Tablo adını beyaz listeye göre doğrular; geçersizse loglar ve `false` döner. */
function assertAllowedTable(table: string, fn: string): boolean {
  if ((ALLOWED_TABLES as readonly string[]).includes(table)) return true;
  console.error(`${fn}: Invalid table "${table}" - not in whitelist`);
  return false;
}

/** Soft delete — tablo adı whitelist ile dogrulanır, SQL injection'dan korunur */
export async function softDelete(table: string, id: string): Promise<boolean> {
  try {
    if (!assertAllowedTable(table, "softDelete")) return false;

    await pool.query(`UPDATE ${table} SET deleted_at = NOW() WHERE id = $1`, [id]);
    return true;
  } catch (err) {
    console.error(`softDelete(${table}) error:`, err);
    return false;
  }
}

/** Yayın durumu güncelleme — publish / unpublish (tablo adı whitelist ile dogrulanır) */
export async function setPublishStatus(
  table: string,
  id: string,
  publish: boolean
): Promise<boolean> {
  try {
    if (!assertAllowedTable(table, "setPublishStatus")) return false;

    if (publish) {
      await pool.query(
        `UPDATE ${table} SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );
    } else {
      await pool.query(
        `UPDATE ${table} SET status = 'draft', published_at = NULL, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );
    }
    return true;
  } catch (err) {
    console.error(`setPublishStatus(${table}) error:`, err);
    return false;
  }
}
