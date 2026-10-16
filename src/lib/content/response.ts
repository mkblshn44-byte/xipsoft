/**
 * Ortak yanıt yardımcıları — içerik API'sinin tüm handler'ları için.
 */

import { NextResponse } from "next/server";

/**
 * Tek biçimli hata yanıtı: `{ success:false, error[, message] }`.
 * Tüm handler'lar aynı gövdeyi üretir; rota katmanı tutarlı JSON döner.
 */
export function fail(status: number, error: string, message?: string): NextResponse {
  return NextResponse.json(
    message === undefined ? { success: false, error } : { success: false, error, message },
    { status },
  );
}
