/**
 * gET /s/[code] — Kısa link redirect
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { SITE_URL } from '@/lib/site-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // Kod formatı kontrolü — sadece alphanumeric 4-10 karakter
  if (!code || !/^[a-zA-Z0-9]{4,10}$/.test(code)) {
    return NextResponse.redirect(new URL('/', SITE_URL));
  }

  try {
    const result = await pool.query(
      `UPDATE short_links SET click_count = click_count + 1
       WHERE code = $1
       RETURNINg original_url`,
      [code]
    );

    if (!result.rows.length) {
      return NextResponse.redirect(new URL('/', SITE_URL));
    }

    return NextResponse.redirect(result.rows[0].original_url, { status: 301 });
  } catch {
    return NextResponse.redirect(new URL('/', SITE_URL));
  }
}
