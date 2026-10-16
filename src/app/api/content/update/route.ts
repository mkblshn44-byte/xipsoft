/**
 * Güvenli & Kısıtlı İçerik Güncelleme API — YALNIZCA mevcut sayfa içeriği
 * POST /api/content/update
 *
 * Dış otomasyon/botlar yalnızca VERİTABANINDA VAR OLAN yerel sayfaların içeriğini
 * güncelleyebilir. Yeni sayfa AÇILAMAZ (INSERT yasak), slug DEĞİŞTİRİLEMEZ.
 *
 * ── Güvenlik / kurallar (bkz. src/lib/content-api.ts → handleRestrictedPageUpdate) ──
 *  1) X-Bot-Key doğrulaması crypto.timingSafeEqual ile (eksik/hatalı → 401).
 *  2) Sıkı şema: yalnızca slug, content, summary, meta_title, meta_description,
 *     lokal_sss, status — başka alan / başka tablo müdahelesi imkânsız.
 *  3) İçerik kalitesi: content ≥1000 karakter & ≥250 kelime; summary ≥50 karakter;
 *     lokal_sss ≥3 dolu soru-cevap; meta_title/meta_description dolu.
 *  4) Varlık kontrolü: slug pages'te yoksa 404; kayıt yalnızca UPDATE edilir
 *     (source_type 'manual' olarak sabitlenir), XSS temizliği uygulanır.
 *  5) Başarı sonrası revalidateTag + revalidatePath → anında canlıya yansır.
 *  6) Yanıt yalnızca işlem özetidir (hassas veri sızdırılmaz).
 *
 * ── İstek örneği ──────────────────────────────────────────────────────────────
 * Header: X-Bot-Key: <BOT_API_KEY>
 * Body: {
 *   "slug": "web-yazilim-tasarim/kocaeli-izmit",
 *   "content": "# Markdown (≥1000 karakter VEYA ≥250 kelime)",
 *   "summary": "Yerel giriş paragrafı (≥50 karakter)",
 *   "meta_title": "İzmit Web Tasarım ve Yazılım | XipSoft",
 *   "meta_description": "İzmit'teki sanayi, ticaret ve hizmet firmaları için...",
 *   "lokal_sss": [ { "question": "...", "answer": "..." }, ... ],   // en az 3
 *   "status": "published"     // draft | review | published | paused
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { handleRestrictedPageUpdate } from "@/lib/content-api";
import { guardContentApiRead, guardContentApiRequest } from "@/lib/content/request-guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Rate-limit → auth (ucuz ret) → payload sırası ortak guard'da sabittir.
  const guard = await guardContentApiRequest(req, {
    endpoint: "/api/content/update",
    rateKeyPrefix: "content",
    withBody: true,
    invalidJsonStatus: 400,
    invalidJsonMessage: "Geçersiz JSON gövdesi",
  });
  if (guard.response) return guard.response;

  return await handleRestrictedPageUpdate(guard.body);
}

// GET — endpoint dokümantasyonu (aynı X-Bot-Key korumalı)
export async function GET(req: NextRequest) {
  const unauthorized = await guardContentApiRead(req, {
    endpoint: "/api/content/update",
    rateKeyPrefix: "content",
  });
  if (unauthorized) return unauthorized;

  return NextResponse.json({
    success: true,
    endpoint: "POST /api/content/update",
    headers: { "X-Bot-Key": "<BOT_API_KEY>" },
    description:
      "Yalnızca mevcut yerel sayfaların içeriğini günceller. Yeni sayfa açılamaz (404), slug değiştirilemez.",
    required_fields: ["slug", "content", "summary", "meta_title", "meta_description", "lokal_sss", "status"],
    content_quality_rules: {
      content: "≥ 1000 karakter VEYA ≥ 250 kelime (Markdown)",
      summary: "≥ 50 karakter (Yerel giriş paragrafı → lokal_aciklama)",
      lokal_sss: "≥ 3 dolu { question, answer } çifti",
      meta_title: "boş olamaz (≤ 160 karakter)",
      meta_description: "boş olamaz (≤ 320 karakter)",
    },
    status_values: ["draft", "review", "published", "paused"],
    note: "source_type her güncellemede 'manual' olarak sabitlenir. slug değiştirilemez; yalnızca lookup içindir.",
    example: {
      slug: "web-yazilim-tasarim/kocaeli-izmit",
      content: "# Markdown içerik (≥1000 karakter)",
      summary: "Yerel giriş paragrafı (≥50 karakter)",
      meta_title: "SEO Başlık",
      meta_description: "SEO açıklama",
      lokal_sss: [
        { question: "Soru 1?", answer: "Cevap 1." },
        { question: "Soru 2?", answer: "Cevap 2." },
        { question: "Soru 3?", answer: "Cevap 3." },
      ],
      status: "published",
    },
  });
}