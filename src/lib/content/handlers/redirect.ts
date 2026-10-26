/**
 * Redirect ingest handler'ı — `seo_redirects` tablosuna 301/302/307/308 yazar.
 *
 * Dış otomasyonların (n8n/Make vb.) eski bir yolu yeni bir yola kalıcı olarak
 * bağlaması için merkezi uç nokta. Yazma sonrası yönlendirme önbelleği
 * (memory + Redis) temizlenir; middleware bir sonraki istekte 301/302 döner.
 * Admin panelindeki `createRedirect` ile aynı normalizasyon kurallarını kullanır.
 */

import { NextResponse } from "next/server";
import pool from "@/lib/db/pool";
import { upsertRedirect } from "@/lib/redirect-handler";
import { pausePublishedNodeForRedirectSource } from "@/lib/seo-conflict-guard";
import {
  normalizeRedirectSource,
  normalizeRedirectTarget,
  isRedirectStatus,
} from "@/lib/redirect-utils";
import { fail } from "../response";

export async function handleRedirectIngest(body: Record<string, unknown>): Promise<NextResponse> {
  const sourceRaw = body.sourcePath ?? body.source ?? body.from;
  const targetRaw = body.targetPath ?? body.target ?? body.to;
  const statusRaw = body.statusCode ?? body.status ?? 301;
  const isActiveRaw = body.isActive ?? body.is_active;

  if (typeof sourceRaw !== "string" || !sourceRaw.trim()) {
    return fail(422, "VALIDATION_ERROR", "sourcePath: zorunludur (ör. /eski-sayfa)");
  }
  if (typeof targetRaw !== "string" || !targetRaw.trim()) {
    return fail(422, "VALIDATION_ERROR", "targetPath: zorunludur (ör. /yeni-sayfa veya https://ornek.com)");
  }

  const statusCode = Number(statusRaw);
  if (!Number.isInteger(statusCode) || !isRedirectStatus(statusCode)) {
    return fail(422, "VALIDATION_ERROR", "statusCode: 301 | 302 | 307 | 308");
  }

  const isActive = isActiveRaw === undefined ? true : isActiveRaw === true || isActiveRaw === "true";

  const sourcePath = normalizeRedirectSource(sourceRaw);
  const targetPath = normalizeRedirectTarget(targetRaw);
  if (!sourcePath || !targetPath || sourcePath === targetPath) {
    return fail(422, "VALIDATION_ERROR", "Geçerli ve birbirinden farklı sourcePath/targetPath girin");
  }

  const redirect = await upsertRedirect(pool, {
    sourcePath,
    targetPath,
    statusCode,
    isActive,
  });
  if (!redirect) {
    return fail(500, "SERVER_ERROR", "Yönlendirme kaydedilemedi");
  }

  // Çakışma koruması: kaynak yolda yayınlı bir içerik ağacı sayfası varsa
  // duraklatılır — route, redirect'i gölgede bırakamaz (`createRedirect` ile
  // aynı kural).
  if (isActive) {
    await pausePublishedNodeForRedirectSource(sourcePath);
  }

  return NextResponse.json(
    {
      success: true,
      redirect: {
        id: redirect.id,
        source_path: redirect.source_path,
        target_path: redirect.target_path,
        status_code: redirect.status_code,
        is_active: redirect.is_active,
      },
      created: redirect.is_insert,
    },
    { status: redirect.is_insert ? 201 : 200 },
  );
}
