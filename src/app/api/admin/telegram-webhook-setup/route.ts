/**
 * Admin Telegram Webhook Setup API
 * GET  /api/admin/telegram-webhook-setup  — mevcut webhook bilgisi
 * POST /api/admin/telegram-webhook-setup  — webhook ayarla veya kaldır
 */

import { NextRequest, NextResponse } from "next/server";
import { extractAuthContext, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

const TG_API = "https://api.telegram.org";

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

export async function GET(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  const token = getBotToken();
  if (!token) return NextResponse.json({ ok: false, error: "Bot token eksik" }, { status: 500 });

  try {
    const res = await fetch(`${TG_API}/bot${token}/getWebhookInfo`);
    const data = await res.json();
    if (!data.ok) return NextResponse.json({ ok: false, error: data.description }, { status: 500 });
    return NextResponse.json({ ok: true, webhook: data.result });
  } catch (err) {
    console.error("[telegram-webhook-setup] GET error:", err);
    return NextResponse.json({ ok: false, error: "Telegram API hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  const token = getBotToken();
  if (!token) return NextResponse.json({ ok: false, error: "Bot token eksik" }, { status: 500 });

  let body: { url?: string; remove?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON" }, { status: 400 });
  }

  try {
    if (body.remove) {
      const res = await fetch(`${TG_API}/bot${token}/deleteWebhook`, { method: "POST" });
      const data = await res.json();
      return NextResponse.json({ ok: data.ok, error: data.description });
    }

    if (!body.url) {
      return NextResponse.json({ ok: false, error: "url gerekli" }, { status: 400 });
    }

    const res = await fetch(`${TG_API}/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: body.url }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: data.ok, error: data.description });
  } catch (err) {
    console.error("[telegram-webhook-setup] POST error:", err);
    return NextResponse.json({ ok: false, error: "Telegram API hatası" }, { status: 500 });
  }
}
