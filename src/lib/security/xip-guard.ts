/**
 * XipGuard — middleware zincirinin en başındaki en ucuz kesim katmanı.
 *
 * Aşım sayacı SÜREÇ İÇİNDEDİR (bkz. `local-window.ts`); Upstash yalnızca öğrenilen
 * engeli diğer warm lambda'lara duyurmak için kullanılır. Eskiden her istek bir
 * `EXISTS` + bir `INCR` gönderiyordu — kota tüketiminin ikinci büyük kalemiydi,
 * karşılığında sıradan ziyaretçinin 35 vuruşa ulaşma ihtimali bile yoktu.
 *
 * Bu katman `ip_blocklist` tablosunun / admin panelinin yerine geçmez — panelde
 * görünen kalıcı bloklara dokunmadan, yalnızca kendi `xip:` anahtar uzayında
 * kısa ömürlü otomatik blok üretir.
 *
 * Kasıtlı seçimler:
 * - Fail-open: Redis'e ulaşılamazsa istek geçirilir ve mevcut zincir kendi
 *   kontrollerini çalıştırmaya devam eder.
 * - Redis'sız ortamda (env yok ya da devre kesici açık) KALICI blok konmaz:
 *   yalnızca o istek 429 alır, pencere dolunca sayaç kendiliğinden düşer.
 *   Aksi halde dev'de 35 kez yenileyen bir geliştirici kendini 1 saat kilitlerdi.
 * - Env yoksa (`UPSTASH_REDIS_REST_URL` / `..._TOKEN`) engel paylaşımı no-op'tur.
 * - Loopback ve arama motoru botları muaf: geliştirici kendini blokatmaz,
 *   Googlebot "flood" sayılıp deindexing'e kurban gitmez.
 */

import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/rate-limit";
import { isLoopbackIp, isSearchBot } from "@/middleware-utils/ip-blocklist";
import { isRedisAvailable, recordRedisFailure, recordRedisSuccess } from "@/lib/redis/breaker";
import {
  bumpLocalWindow,
  isLocallyBlocked,
  noteLocalBlock,
  shouldProbe,
} from "@/lib/security/local-window";

const BLOCK_KEY_PREFIX = "xip:block:";

/** 10 saniyede 35 vuruşu geçen IP geçici bloğa alınır. */
const RATE_LIMIT_WINDOW_SECONDS = 10;
const MAX_REQUESTS_PER_WINDOW = 35;
const TEMP_BLOCK_SECONDS = 60 * 60;
/** Öğrenilen engeli süreç içinde de bu süre kadar hatırla. */
const LOCAL_BLOCK_TTL_MS = TEMP_BLOCK_SECONDS * 1000;

/** Upstash'e erişim middleware'in p95'ini domine etmesin. */
const REDIS_TIMEOUT_MS = 400;
/** "Başka bir instance blok koymuş mu?" yoklaması: IP başına dakikada bir komut. */
const REMOTE_READ_GATE_MS = 60_000;
/** Aşan IP için Redis'e blok yazma aralığı — yazma tekrarını keser. */
const BLOCK_WRITE_GATE_MS = 60_000;

export const GUARD_MESSAGE = "NEREYE DOSTUM ?";

/** Engel paylaşımı bu an için mümkün mü (env tanımlı ve devre kapalı)? */
function isRemoteGuardActive(): boolean {
  return (
    Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN) &&
    isRedisAvailable()
  );
}

/**
 * Ham Upstash REST çağrısı. Komutlar URL path'i yerine JSON gövdeyle gönderilir:
 * IPv6 adresleri `:` içerdiğinden `xip:block:2001:db8::1` path segment'i
 * bozardı. Yanıt Upstash tarafında `{ result: ... }` zarfı içinde gelir.
 *
 * Bu katman `@upstash/redis` client'ını kullanmadığı için devre kesici sinyali
 * burada ayrıca beslenir. Hata gövdesi mesaja eklenir: kota hatası yalnızca
 * body'de görünür, sınıflandırma ona bakar.
 */
async function redis(args: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  // Devre açıksa 400ms timeout'u boşuna bekleme.
  if (!isRedisAvailable()) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      throw new Error(`Upstash REST ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as { result?: unknown };
    recordRedisSuccess();
    return data.result ?? null;
  } catch (error) {
    recordRedisFailure(error);
    throw error;
  }
}

async function isBlockedRemotely(ip: string): Promise<boolean> {
  try {
    return (await redis(["EXISTS", `${BLOCK_KEY_PREFIX}${ip}`])) === 1;
  } catch {
    return false;
  }
}

async function blockIpTemporarily(ip: string): Promise<void> {
  try {
    await redis(["SET", `${BLOCK_KEY_PREFIX}${ip}`, "1", "EX", TEMP_BLOCK_SECONDS]);
  } catch {
    // Yazılamazsa bu istek yine 429 alır; aşan IP yerelde de işaretli kalır.
  }
}

/**
 * `connection: close` header'ı istemci tarafındaki keep-alive'ı kapatmaz —
 * istemci Vercel edge/CDN'inde terminate olur. Tasarruf header'dan değil,
 * render ve DB sorgularından ÖNCE dönülmesinden gelir.
 */
function guardResponse(status: 403 | 429, retryAfterSeconds?: number): NextResponse {
  const headers = new Headers({
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    connection: "close",
  });
  if (retryAfterSeconds) headers.set("retry-after", String(retryAfterSeconds));
  return new NextResponse(GUARD_MESSAGE, { status, headers });
}

/**
 * @returns bloklanmışsa gönderilecek cevap, geçtiyse `null` (middleware akışa devam eder)
 */
export async function xipGuardCheck(req: NextRequest): Promise<NextResponse | null> {
  // getClientIp: güvenilir `cf-connecting-ip`/`x-real-ip`, o da yoksa XFF'in SON
  // girdisi. İlk girdi istemcinin kendisinin yazdığı değerdir; ona güvenmek
  // `X-Forwarded-For: 8.8.8.8` ile hem blok aşımı hem de masum IP'yi blokatma
  // yolu olurdu.
  const ip = getClientIp(req);
  if (ip === "unknown" || isLoopbackIp(ip)) return null;
  if (isSearchBot(req.headers.get("user-agent"))) return null;

  // 1) Süreç içi sabit pencere. Normal trafiğin tamamı burada biter — Redis'e
  //    tek komut gitmez. Pencere kendiliğinden düştüğü için eski "EXPIRE
  //    yenilenmezse sayaç ölümsüzleşir" tuzağı da yok.
  const window = bumpLocalWindow(`xip:${ip}`, RATE_LIMIT_WINDOW_SECONDS * 1000);
  if (window.count > MAX_REQUESTS_PER_WINDOW) {
    // Engel paylaşımı açıksa kalıcı hale getir; değilse yalnızca bu istek 429
    // alır (dev'de kendi kendini 1 saat kilitleyen geliştirici istemiyoruz).
    if (isRemoteGuardActive()) {
      noteLocalBlock(ip, LOCAL_BLOCK_TTL_MS);
      if (shouldProbe(`xip:wr:${ip}`, BLOCK_WRITE_GATE_MS)) {
        await blockIpTemporarily(ip);
      }
    }
    return guardResponse(429, TEMP_BLOCK_SECONDS);
  }

  // 2) Daha önce öğrenilmiş engel (kendi aşımımız ya da 3. adım) — Redis'e sorulmaz.
  //    Okuma kapısı engeli UNUTMAMALI; aksi halde 60sn boyunca geçirdiğimiz
  //    bloklanmış IP'ler görürdük.
  if (isLocallyBlocked(ip)) return guardResponse(403);

  // 3) Başka bir instance'ın koyduğu engeli seyrek yokla: IP başına dakikada bir
  //    komut. Eskiden her istekte EXISTS soruluyordu — kota tüketiminin ikinci
  //    büyük kalemi, karşılığında sıradan ziyaretçinin 35 vuruşa ulaşma ihtimali yoktu.
  if (isRemoteGuardActive() && shouldProbe(`xip:rd:${ip}`, REMOTE_READ_GATE_MS)) {
    if (await isBlockedRemotely(ip)) {
      noteLocalBlock(ip, LOCAL_BLOCK_TTL_MS);
      return guardResponse(403);
    }
  }

  return null;
}
