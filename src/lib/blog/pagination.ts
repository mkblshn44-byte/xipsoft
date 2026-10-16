/**
 * blog/pagination.ts — Sayfalı sorgu sonucu yardımcıları.
 */

import type { PaginatedResult } from "@/types/common";

/** Sayfalı sorgu sonucunu PaginatedResult'a dönustur */
export function buildPaginatedResult<T>(
  rows: Record<string, unknown>[],
  pageSize: number,
  offset: number,
  mapper: (row: Record<string, unknown>) => T
): PaginatedResult<T> {
  const hasMore = rows.length > pageSize;
  return {
    data: rows.slice(0, pageSize).map(mapper),
    hasMore,
    nextOffset: offset + pageSize,
  };
}
