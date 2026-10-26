/**
 * Redis devre kesici — arızayı "istek başına" değil "olay başına" işler.
 *
 * Upstash aylık komuta kotası dolduğunda (`max requests limit exceeded`) ya da
 * Redis'e ulaşılamadığında, middleware'deki HER istek yeniden HTTP'e çıkıyor ve
 * başarısızlığın tamamı (stack dahil) log'a yazılıyordu. O anda koruma zaten
 * ölüydü; üstine istek başına ~400ms gecikme ve log yığını ekleniyordu.
 *
 * Buradaki sözleşme ince: devre açıksa `getRedisClient()` `null` döner. Tüketicilerin
 * tamamı `null`'ı zaten "Redis yapılandırılmamış" gibi karşılıyor (sayfalar
 * fail-open, `/api/*` fail-closed), yani yeni bir davranış icat edilmiyor — yalnızca
 * faydasız deneme ve log tekrarı kesiliyor. Süre dolunca ilk istek tekrar dener;
 * hata sürüyorsa devre yeniden açılır.
 */

/** Geçici hatada devreyi açmak için gereken ardışık hata sayısı. */
const FAILURE_THRESHOLD = 3;
/** Geçici hata sonrası Redis'e gitmeme süresi. */
const TRANSIENT_COOLDOWN_MS = 30_000;
/** Kota dolmuşsa erken denemenin faydası yok; bekleme uzun tutulur. */
const QUOTA_COOLDOWN_MS = 10 * 60_000;

interface BreakerState {
  consecutiveFailures: number;
  /** Bu ana kadar devre açık; 0 = kapalı. */
  openUntil: number;
  /** Olay başına bir kez ham hata satırı yazıldı mı. */
  firstFailureLogged: boolean;
  /** Devre açılışı loglandı mı (kapanışta sıfırlanır). */
  openLogged: boolean;
}

type BreakerHandle = { state: BreakerState };

/**
 * Dev/HMR: modül her yeniden derlemede tekrar çalışır; sayaçlar `globalThis`'te
 * taşınmazsa ardışık hata sayısı sıfırlanır ve devre hiç açılmaz.
 */
const globalBreaker = globalThis as typeof globalThis & {
  __xipsoftRedisBreaker?: BreakerHandle;
};

function handle(): BreakerHandle {
  if (!globalBreaker.__xipsoftRedisBreaker) {
    globalBreaker.__xipsoftRedisBreaker = {
      state: {
        consecutiveFailures: 0,
        openUntil: 0,
        firstFailureLogged: false,
        openLogged: false,
      },
    };
  }
  return globalBreaker.__xipsoftRedisBreaker;
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.replace(/\s+/g, ' ').slice(0, 220);
}

/** Upstash aylık/günlük komuta kotası hatası mı? (plan fark etmeksizin aynı sınıf) */
export function isQuotaError(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    message.includes('max requests limit exceeded') ||
    message.includes('max daily request limit') ||
    message.includes('max monthly request limit')
  );
}

/** Redis'e bu an izin var mı? Devre açıksa `false` — hiçbir komut gönderilmez. */
export function isRedisAvailable(): boolean {
  return handle().state.openUntil <= Date.now();
}

/**
 * Başarısız komutu bildirir. Kota hatası tek denemede devreyi açar (yeniden
 * denemenin faydası yok); diğer hatalar `FAILURE_THRESHOLD` ardışıkta açar.
 */
export function recordRedisFailure(error: unknown): void {
  const { state } = handle();
  const quota = isQuotaError(error);
  state.consecutiveFailures++;

  if (!state.firstFailureLogged) {
    state.firstFailureLogged = true;
    console.error('[Redis] Erişim hatası:', errorMessage(error));
  }

  if (!quota && state.consecutiveFailures < FAILURE_THRESHOLD) return;

  const cooldownMs = quota ? QUOTA_COOLDOWN_MS : TRANSIENT_COOLDOWN_MS;
  state.openUntil = Date.now() + cooldownMs;

  if (!state.openLogged) {
    state.openLogged = true;
    console.error(
      quota
        ? `[Redis] Upstash kotası dolu — ${cooldownMs / 1000}s boyunca komut gönderilmeyecek, istekler Redis'sız akıyor.`
        : `[Redis] Devre açıldı (${state.consecutiveFailures} ardışık hata) — ${cooldownMs / 1000}s boyunca deneme yok.`,
    );
  }
}

/** Başarılı komut: sayacı sıfırlar, devreyi kapatır. */
export function recordRedisSuccess(): void {
  const { state } = handle();
  if (state.openLogged) {
    console.log('[Redis] Devre kapandı — erişim geri geldi.');
  } else if (state.firstFailureLogged && state.consecutiveFailures > 0) {
    console.log('[Redis] Hata geçti, komutlar tekrar gidiyor.');
  }
  state.consecutiveFailures = 0;
  state.openUntil = 0;
  state.firstFailureLogged = false;
  state.openLogged = false;
}
