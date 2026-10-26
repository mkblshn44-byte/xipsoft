/**
 * Next 15 instrumentation hook — her sunucu instance'ı ayağa kalkarken bir kez
 * çalışır (edge dahil, o yüzden runtime'a göre ayrılır).
 *
 * Buradaki tek iş `site_visitors` şemasını ilk istekten önce hazırlamak. Şema
 * kontrolü memoized olduğu için request başına DDL atmıyordu; ama soğuk bir
 * lambda'nın İLK `/api/track` isteği 4 DDL turunu + bağlantı kurulumunu kendi
 * üstünde ödüyordu (üretime yakın ölçümde ilk istek ~1.2 s). Instance açılışına
 * almak o maliyeti kullanıcı isteğinden çıkarır.
 *
 * Handler'daki `await ensureSiteVisitorAnalyticsSchema()` bilinçli olarak duruyor:
 * promise resolve olduğunda await bedava; register() başarısız olursa (soğuk
 * start'ta DB erişilemezse) memoization sıfırlandığı için ilk istek kendini
 * iyileştirir.
 */
export async function register(): Promise<void> {
  // Next, instrumentation'ı EDGE için de derler. import'u PozİTİF `if` içine
  // almak şart: erken return kullanırsan webpack koşullu derlemeyi (DCE)
  // uygulamıyor ve `pg → fs` trace'i edge bundle'ında kırılıyor (`Module not
  // found: Can't resolve 'fs'` → dev'de tüm sayfalar 500).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSiteVisitorAnalyticsSchema } = await import(
      "@/lib/db/site-visitors"
    );
    await ensureSiteVisitorAnalyticsSchema();
  }
}
