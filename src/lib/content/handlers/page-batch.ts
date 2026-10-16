/**
 * Page batch ingest handler'ı — 1–20 sayfa yükünü sırayla işler ve kısmi
 * başarıyı raporlar (207 Multi-Status).
 */

import { NextResponse } from "next/server";
import { fail } from "../response";
import { isPlainRecord } from "../validation";
import { pageIngestCore } from "./page";

export async function handlePageBatchIngest(body: Record<string, unknown>): Promise<NextResponse> {
  const pages = body.pages;
  if (!Array.isArray(pages) || pages.length === 0 || pages.length > 20) {
    return fail(422, "VALIDATION_ERROR", "pages: 1–20 sayfa içeren bir dizi olmalıdır");
  }

  const results: Array<Record<string, unknown>> = [];
  // Batch items are independent upserts; report partial success instead of hiding earlier writes.
  for (const [index, page] of pages.entries()) {
    if (!isPlainRecord(page)) {
      results.push({ index, success: false, error: "Sayfa girdisi nesne olmalıdır" });
      continue;
    }

    try {
      const { status, payload } = await pageIngestCore(page);
      const ok = status >= 200 && status < 300;
      if (!ok || payload.success !== true) {
        const error = payload.message ?? payload.error ?? "Sayfa kaydedilemedi";
        results.push({
          index,
          success: false,
          error: typeof error === "string" ? error : JSON.stringify(error),
        });
        continue;
      }
      results.push({
        index,
        success: true,
        page_id: payload.page_id,
        slug: payload.slug,
        status: payload.status,
      });
    } catch (error) {
      results.push({
        index,
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    }
  }

  const failed = results.filter((result) => result.success !== true);
  return NextResponse.json(
    { success: failed.length === 0, total: results.length, failed: failed.length, results },
    { status: failed.length === 0 ? 200 : 207 },
  );
}
