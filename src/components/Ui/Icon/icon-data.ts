/**
 * XipSoft — Özel ikon geometrisi (dış ikon bağımlılığı YOK).
 *
 * TASARIM DİLİ
 * ────────────
 * • Tuval: 24×24, optik güvenli alan 3–21 arası (taşma yok).
 * • Çizgi: 1,7 birim tek kalınlık — tüm set tek elden çizildi.
 * • Form: geometrik/köşeli (chamfer), abartısız yuvarlatma; "LED / prizma"
 *   kimliğine uygun düz segmentler + tek karakteristik "LED düğümü" (nokta).
 * • Renk: `currentColor` — bileşen rengi neyse ikon onu alır.
 *
 * KURAL: Buradaki her giriş elle çizilmiştir; hiçbir üçüncü taraf ikon
 * setinden kopyalanmamıştır. Yeni ikon eklerken aynı 24×24 ızgaraya,
 * 3–21 güvenli alana ve düğüm konvansiyonuna uyulmalıdır.
 */

/** Tek bir SVG primitifi. */
export type IconNode =
  | { k: "p"; d: string }                        // çizilen yol (stroke)
  | { k: "c"; cx: number; cy: number; r: number } // çizilen daire (stroke)
  | { k: "n"; cx: number; cy: number; r: number } // dolu LED düğümü (fill)
  | { k: "f"; d: string };                       // dolu yol (fill, nadir)

// ── Kısa yardımcılar (dosyayı okunur tutar) ───────────────────────────────
const p = (d: string): IconNode => ({ k: "p", d });
const c = (cx: number, cy: number, r: number): IconNode => ({ k: "c", cx, cy, r });
/** LED düğümü — setin imza detayı. Varsayılan yarıçap 1,15. */
const n = (cx: number, cy: number, r = 1.15): IconNode => ({ k: "n", cx, cy, r });

// ── Ortak parçalar ────────────────────────────────────────────────────────
const FILE_OUTLINE = p(
  "M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5L14 3.5z",
);
const FILE_CORNER = p("M14 3.5V7.5h4");
const SHIELD_OUTLINE = p(
  "M12 3.5 5 6.2v5.6c0 4 2.9 7.4 7 8.7 4.1-1.3 7-4.7 7-8.7V6.2L12 3.5z",
);
const EYE_OUTLINE = p(
  "M12 5.5c-5.2 0-8.7 6.5-8.7 6.5s3.5 6.5 8.7 6.5 8.7-6.5 8.7-6.5S17.2 5.5 12 5.5z",
);
const CUBE_SHELL = p("M12 3.5 3.5 8l8.5 4.5L20.5 8 12 3.5z");

/**
 * İkon kayıt defteri. Anahtarlar lucide adlarının kebab-case karşılığıdır
 * (ör. `BarChart2` → `bar-chart2`); böylece mevcut veritabanı `badgeIcon`
 * değerleri ve bileşen adları tek harita değişikliğiyle taşınabilir.
 */
export const ICONS: Record<string, IconNode[]> = {
  // ══ Hizmet / yetkinlik ikon ailesi (DB `badgeIcon` ile eşleşir) ═════════
  globe: [
    c(12, 12, 8.5),
    p("M3.5 12h17"),
    p("M12 3.5c2.6 2.4 4.1 5.4 4.1 8.5s-1.5 6.1-4.1 8.5c-2.6-2.4-4.1-5.4-4.1-8.5S9.4 5.9 12 3.5z"),
  ],
  smartphone: [
    p("M8 3.5h8A1.5 1.5 0 0 1 17.5 5v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5z"),
    p("M10.5 17.5h3"),
  ],
  tablet: [
    p("M6.5 3.5h11A1.5 1.5 0 0 1 19 5v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z"),
    p("M10.5 17h3"),
  ],
  palette: [
    p("M12 3.5a8.5 8.5 0 0 0 0 17c1.3 0 2.2-.9 2.2-2.1 0-1.2-1-1.9-1-3 0-1 .8-1.8 1.9-1.8h1.5c2 0 3.4-1.4 3.4-3.5C20 6.3 16.4 3.5 12 3.5z"),
    n(8.6, 9.6, 1.25),
    n(11.8, 7.4, 1.25),
    n(7.4, 13.2, 1.25),
  ],
  code: [p("M9 7.5 4.5 12 9 16.5"), p("M15 7.5 19.5 12 15 16.5")],
  code2: [
    p("M16 5.5 8 18.5"),
    p("M7.5 8.5 4.5 12l3 3.5"),
    p("M16.5 8.5l3 3.5-3 3.5"),
  ],
  zap: [p("M13.5 3.5 6 13h4.5l-1 7.5L17.5 11H13z")],
  shield: [SHIELD_OUTLINE],
  "shield-check": [SHIELD_OUTLINE, p("m9.1 12.2 2.1 2.1 4-4.4")],
  "shield-x": [SHIELD_OUTLINE, p("m9.6 9.6 4.8 4.8"), p("m14.4 9.6-4.8 4.8")],
  layers: [
    CUBE_SHELL,
    p("M3.5 12.5 12 17l8.5-4.5"),
    p("M3.5 16.5 12 21l8.5-4.5"),
  ],
  database: [
    p("M12 3.5c4.1 0 7.5 1.3 7.5 3s-3.4 3-7.5 3-7.5-1.3-7.5-3 3.4-3 7.5-3z"),
    p("M4.5 6.5v11c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-11"),
    p("M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"),
  ],
  search: [c(10.5, 10.5, 6.5), p("m15.4 15.4 5.1 5.1")],
  "bar-chart2": [
    p("M3.5 20.5h17"),
    p("M7 20.5V12"),
    p("M12 20.5V5.5"),
    p("M17 20.5v-6"),
  ],
  monitor: [
    p("M4.5 5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"),
    p("M9 20h6"),
    p("M12 16v4"),
  ],
  terminal: [
    p("M4.5 4.5h15a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1z"),
    p("m7.5 9.5 2.5 2.5-2.5 2.5"),
    p("M12.5 15h4"),
  ],
  cloud: [
    p("M7 18.5h9.5a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6 1.4A3.6 3.6 0 0 0 7 18.5z"),
  ],
  lock: [
    p("M5.5 10.5h13a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V11.5a1 1 0 0 1 1-1z"),
    p("M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"),
    n(12, 15.2, 1.2),
  ],
  unlock: [
    p("M5.5 10.5h13a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V11.5a1 1 0 0 1 1-1z"),
    p("M8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2"),
    n(12, 15.2, 1.2),
  ],
  eye: [EYE_OUTLINE, c(12, 12, 3)],
  "eye-off": [
    EYE_OUTLINE,
    c(12, 12, 3),
    p("M4 4l16 16"),
  ],
  "file-check": [FILE_OUTLINE, FILE_CORNER, p("m9.5 14 1.7 1.7 3.3-3.7")],
  "file-text": [
    FILE_OUTLINE,
    FILE_CORNER,
    p("M9 11.5h6"),
    p("M9 15h4"),
  ],
  "alert-triangle": [
    p("M12 4 3.2 19.6a1 1 0 0 0 .9 1.4h15.8a1 1 0 0 0 .9-1.4L12 4z"),
    p("M12 9.8v4.2"),
    n(12, 17.4, 1.05),
  ],
  "alert-circle": [c(12, 12, 8.5), p("M12 7.5v5"), n(12, 16, 1.05)],
  server: [
    p("M4.5 4h15a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"),
    p("M4.5 13h15a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z"),
    n(7.8, 7.5, 1.1),
    n(7.8, 16.5, 1.1),
  ],
  brain: [
    p("M12 5.5v13"),
    p("M12 5.5A3 3 0 0 0 6.6 7.4 2.8 2.8 0 0 0 5.2 12a3 3 0 0 0 2 5.4A2.6 2.6 0 0 0 12 18.5"),
    p("M12 5.5A3 3 0 0 1 17.4 7.4 2.8 2.8 0 0 1 18.8 12a3 3 0 0 1-2 5.4A2.6 2.6 0 0 1 12 18.5"),
    p("M8.4 10.4c1.1 0 1.5 1 2.6 1"),
    p("M15.6 10.4c-1.1 0-1.5 1-2.6 1"),
    p("M9.6 15.2c.9 0 1.2-.8 2.1-.8"),
  ],
  bot: [
    p("M6.5 9h11a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5v-8A1.5 1.5 0 0 1 6.5 9z"),
    p("M12 6V9"),
    p("M12 3.5V6"),
    n(9.3, 12.8, 1.1),
    n(14.7, 12.8, 1.1),
    p("M9.5 16.6h5"),
    p("M2.5 13v3"),
    p("M21.5 13v3"),
  ],
  workflow: [
    p("M4 4h6v6H4z"),
    p("M14 14h6v6h-6z"),
    p("M10 7h4.5a3 3 0 0 1 3 3v4"),
  ],
  cpu: [
    p("M7.5 7.5h9v9h-9z"),
    p("M10.5 10.5h3v3h-3z"),
    p("M9.5 4.5v3M14.5 4.5v3M9.5 16.5v3M14.5 16.5v3M4.5 9.5h3M4.5 14.5h3M16.5 9.5h3M16.5 14.5h3"),
  ],
  "trending-up": [p("M3.5 17.5 9 12l3.5 3.5 8-8"), p("M15.5 7.5h5v5")],
  "trending-down": [p("M3.5 6.5 9 12l3.5-3.5 8 8"), p("M20.5 11.5v5h-5")],
  target: [c(12, 12, 8.5), c(12, 12, 4.5), n(12, 12, 1.3)],
  users: [
    c(9, 8.5, 3.5),
    p("M2.5 20.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"),
    p("M16.5 5.3a3.5 3.5 0 0 1 0 6.4"),
    p("M18.5 14.2c1.9.9 3 2.8 3 5.1"),
  ],
  "mouse-pointer": [p("M5.5 3.5 19 13l-5.9 1.2L11 20.5 5.5 3.5z"), p("m13.6 14.6 5.9 5.9")],
  "git-branch": [
    c(7, 6, 2.5),
    c(7, 18, 2.5),
    c(17, 10, 2.5),
    p("M7 8.5v7"),
    p("M17 12.5c0 3.2-2.2 5.5-5.5 5.5H9.5"),
  ],
  "git-merge": [
    c(7, 6, 2.5),
    c(7, 18, 2.5),
    c(17, 12, 2.5),
    p("M7 8.5v7"),
    p("M9.5 12h5"),
  ],
  "refresh-cw": [
    p("M20.5 12a8.5 8.5 0 0 0-14.6-5.9L3.5 8.3"),
    p("M3.5 3.5v5h5"),
    p("M3.5 12a8.5 8.5 0 0 0 14.6 5.9l2.4-2.2"),
    p("M20.5 20.5v-5h-5"),
  ],
  link2: [
    p("M9.2 14.8a4.2 4.2 0 0 0 6 0l3.1-3.1a4.2 4.2 0 1 0-6-6L10.9 7.2"),
    p("M14.8 9.2a4.2 4.2 0 0 0-6 0L5.7 12.3a4.2 4.2 0 1 0 6 6l1.4-1.5"),
  ],
  webhook: [
    c(12, 5, 2.3),
    c(5.5, 17.5, 2.3),
    c(18.5, 17.5, 2.3),
    p("M10.4 6.8 6.9 15.3"),
    p("M13.6 6.8l3.5 8.5"),
    p("M7.8 17.5h8.4"),
  ],
  "pie-chart": [p("M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z"), p("M12 12V3.5")],
  filter: [p("M3.5 5h17l-6.6 7.6v6.4l-3.8 2v-8.4L3.5 5z")],
  "check-circle": [c(12, 12, 8.5), p("m8.3 12.3 2.5 2.5 4.9-5.4")],
  package: [
    CUBE_SHELL,
    p("M3.5 8v8L12 20.5 20.5 16V8"),
    p("M12 12.5v8"),
  ],
  "map-pin": [
    p("M12 3.5c3.3 0 6 2.7 6 6 0 4.4-6 11-6 11s-6-6.6-6-11c0-3.3 2.7-6 6-6z"),
    c(12, 9.5, 2.2),
  ],
  sparkles: [
    p("M10.5 3.5 12 7.6l4.1 1.5-4.1 1.5-1.5 4.1-1.5-4.1L4.9 9.1 9 7.6z"),
    p("M17.8 14.2l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"),
  ],
  "shopping-cart": [
    c(9.5, 19.5, 1.5),
    c(17.5, 19.5, 1.5),
    p("M2.5 4h2.7l2.6 10.5h10.3L20.5 7H6.3"),
  ],
  "building2": [
    p("M4.5 20.5V6l7-2.5v17"),
    p("M11.5 9.5h8v11"),
    p("M3 20.5h18"),
    p("M14.5 13h2M14.5 16.5h2"),
  ],
  truck: [
    p("M2.5 6.5h10v9.5h-10z"),
    p("M12.5 10h4l3 3v3h-7z"),
    c(6.5, 18.5, 1.8),
    c(16.5, 18.5, 1.8),
  ],
  "heart-pulse": [
    p("M12 20.5S3.5 15.2 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 5.6-8.5 10.9-8.5 10.9z"),
    p("M3.8 12h4l1.7-3 2.5 6 1.7-3h5.5"),
  ],
  "graduation-cap": [
    p("M12 4 2.5 8.5 12 13l9.5-4.5L12 4z"),
    p("M6.5 10.8v5c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-5"),
    p("M21.5 8.5v5.5"),
  ],
  scale: [
    p("M12 4v16"),
    p("M6.5 20h11"),
    p("M4 8.5h16"),
    p("M4 8.5 1.5 14h5z"),
    p("M20 8.5 17.5 14h5z"),
  ],
  cookie: [
    p("M20.5 12.6A8.5 8.5 0 1 1 11.4 3.5a3.5 3.5 0 0 0 4.3 4.4 3.5 3.5 0 0 0 4.8 4.7z"),
    n(8.6, 9.2, 1.1),
    n(9.5, 14.8, 1.1),
    n(14.6, 15.6, 1.1),
  ],
  flame: [
    p("M13.2 3.5c.4 2.6 2.1 3.6 3.4 5.4a6.6 6.6 0 0 1 1.4 4.2 6 6 0 0 1-12 0c0-2 .8-3.6 2-4.9.3 1 .9 1.7 1.6 2.1-.4-2.6 1.6-5.2 3.6-6.8z"),
    p("M12 17.6a2.6 2.6 0 0 1-2.6-2.6c0-1.6 1.5-2.1 2.6-3.7 1.1 1.6 2.6 2.1 2.6 3.7a2.6 2.6 0 0 1-2.6 2.6z"),
  ],

  // ══ Navigasyon / arayüz ikonları ════════════════════════════════════════
  "arrow-right": [p("M4 12h15"), p("m13 6 6 6-6 6")],
  "arrow-left": [p("M20 12H5"), p("m11 6-6 6 6 6")],
  "arrow-up": [p("M12 20V5"), p("m6 11 6-6 6 6")],
  "arrow-down": [p("M12 4.5v15"), p("m6 13.5 6 6 6-6")],
  "arrow-up-right": [p("M7 17 17 7"), p("M9 7h8v8")],
  "chevron-down": [p("m6 9.5 6 6 6-6")],
  "chevron-left": [p("m14.5 5.5-6 6.5 6 6.5")],
  "chevron-right": [p("m9.5 5.5 6 6.5-6 6.5")],
  x: [p("m6.5 6.5 11 11"), p("m17.5 6.5-11 11")],
  "x-circle": [c(12, 12, 8.5), p("m9.2 9.2 5.6 5.6"), p("m14.8 9.2-5.6 5.6")],
  menu: [p("M4 7h16M4 12h16M4 17h16")],
  "more-horizontal": [n(5.5, 12), n(12, 12), n(18.5, 12)],
  user: [c(12, 8, 3.7), p("M4.5 20.5c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5")],
  "user-plus": [
    c(10, 8.5, 3.7),
    p("M2.5 20.5c0-4.1 3.4-7.5 7.5-7.5 1.6 0 3.1.5 4.3 1.3"),
    p("M18 13.5v6"),
    p("M15 16.5h6"),
  ],
  "log-in": [
    p("M14.5 4.5h3A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5h-3"),
    p("m8.5 8.5 3.5 3.5-3.5 3.5"),
    p("M12 12H3.5"),
  ],
  "log-out": [
    p("M9.5 4.5h-3A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5h3"),
    p("m15.5 8.5 3.5 3.5-3.5 3.5"),
    p("M19 12H9.5"),
  ],
  send: [p("M4 11.5 20.5 4l-7.2 16.5-2.1-7.2z"), p("M11.2 13.3 20.5 4")],
  mail: [
    p("M4.5 5.5h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z"),
    p("m3.8 6.5 8.2 6 8.2-6"),
  ],
  phone: [
    p("M7.4 3.5H4.5v3c0 7.7 5.3 13 13 13h3v-2.9l-4.1-1.6-2 2c-2.6-1.1-5.3-3.8-6.4-6.4l2-2z"),
  ],
  clock: [c(12, 12, 8.5), p("M12 7v5l3.2 2")],
  calendar: [
    p("M4.5 5.5h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z"),
    p("M3.5 10h17"),
    p("M8 3.5v4M16 3.5v4"),
  ],
  tag: [
    p("M11.6 3.5H20.5v8.9l-8.6 8.6a1.4 1.4 0 0 1-2 0l-6.9-6.9a1.4 1.4 0 0 1 0-2z"),
    n(16.8, 7.2, 1.25),
  ],
  "book-open": [
    p("M12 7.5C10 6 7.4 5.5 4.5 5.5v13c2.9 0 5.5.5 7.5 2 2-1.5 4.6-2 7.5-2v-13c-2.9 0-5.5.5-7.5 2z"),
    p("M12 7.5v13"),
  ],
  "message-circle": [
    p("M20 12c0 4.1-3.6 7.5-8 7.5-1.1 0-2.1-.2-3-.6L4.5 20.5l1.5-4.2A7.2 7.2 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 3.4 8 7.5z"),
  ],
  "message-square": [
    p("M4.5 5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8.4L6 20.5V16H4.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"),
  ],
  "corner-down-right": [p("M4.5 5.5v6a2 2 0 0 0 2 2h11"), p("m14 9.5 3.5 4-3.5 4")],
  bell: [
    p("M18 16.5V11a6 6 0 1 0-12 0v5.5l-1.5 2h15z"),
    p("M10 21h4"),
  ],
  settings: [
    c(12, 12, 3.2),
    p("M12 3.5l.7 2.6 2 1.2 2.6-.7 1.6 2.8-1.7 2.1v2.3l1.7 2.1-1.6 2.8-2.6-.7-2 1.2-.7 2.6h-3.2l-.7-2.6-2-1.2-2.6.7-1.6-2.8 1.7-2.1v-2.3L2.9 9.4l1.6-2.8 2.6.7 2-1.2.7-2.6z"),
  ],
  home: [
    p("M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"),
    p("M9.5 21v-6h5v6"),
  ],
  wrench: [
    p("M19.4 3.8a4.6 4.6 0 0 0-5.5 5.9l-8.3 8.3a2.3 2.3 0 0 0 3.2 3.2l8.3-8.3a4.6 4.6 0 0 0 5.9-5.5l-2.9 2.9-2.7-.7-.7-2.7z"),
  ],
  star: [p("M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.7-5 2.7.9-5.6-4-3.9 5.6-.8z")],
  quote: [
    p("M7.5 6.5h4v5.5c0 3.3-1.6 5.4-4.5 6.5l-.8-1.6c1.7-.7 2.6-1.8 2.8-3.4H7.5z"),
    p("M14.5 6.5h4v5.5c0 3.3-1.6 5.4-4.5 6.5l-.8-1.6c1.7-.7 2.6-1.8 2.8-3.4h-1.5z"),
  ],
  trophy: [
    p("M8 3.8h8v6.2a4 4 0 0 1-8 0z"),
    p("M8 5.5H5.6v1.6A2.9 2.9 0 0 0 8 10"),
    p("M16 5.5h2.4v1.6A2.9 2.9 0 0 1 16 10"),
    p("M12 14v3"),
    p("M9.5 20.5h5l-.6-3h-3.8z"),
  ],
  check: [p("m5 12.5 5 5 9-11")],
  copy: [
    p("M9.5 9.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"),
    p("M14.5 9.5v-3a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"),
  ],
  "external-link": [
    p("M13.5 4.5H19a.5.5 0 0 1 .5.5v5.5"),
    p("M19.5 4.5 12 12"),
    p("M17.5 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1h5.5"),
  ],
  loader: [p("M12 3.5a8.5 8.5 0 1 0 8.5 8.5")],
  plus: [p("M12 5.5v13"), p("M5.5 12h13")],
  minus: [p("M5.5 12h13")],
  trash2: [
    p("M4.5 7.5h15"),
    p("M9 7.5V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5"),
    p("M6.5 7.5 7.5 20a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-12.5"),
  ],
  save: [
    p("M6 3.5h9.5L20.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z"),
    p("M8.5 3.5v6h7v-6"),
    p("M8 20.5V14h8v6.5"),
  ],
  wifi: [
    p("M3.5 9.5a13 13 0 0 1 17 0"),
    p("M6.8 12.8a8.5 8.5 0 0 1 10.4 0"),
    p("M10 16a4 4 0 0 1 4 0"),
    n(12, 19.3, 1.2),
  ],
  hash: [p("M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h15M3.8 15h15")],
  briefcase: [
    p("M4.5 8h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"),
    p("M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"),
    p("M3.5 12.5h17"),
  ],
  camera: [
    p("M4.5 7.5h3l1.4-2.2a1 1 0 0 1 .9-.8h4.4a1 1 0 0 1 .9.8l1.4 2.2h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"),
    c(12, 13, 3.4),
  ],
  activity: [p("M3 12h3.5l2.5-6 4 12 2.5-6H21")],
  list: [p("M8 6.5h12M8 12h12M8 17.5h12"), n(4.2, 6.5, 1.05), n(4.2, 12, 1.05), n(4.2, 17.5, 1.05)],
};

/**
 * Ek başlık/bağlantı ikonları (yukarıdaki aile ile aynı dil).
 * `link`, `list-ordered` gibi çok parçalı olanlar burada tam hâliyle durur.
 */
ICONS.link = [
  p("M10.6 13.4a4 4 0 0 0 5.7 0l2.5-2.5a4 4 0 1 0-5.7-5.7l-1.2 1.2"),
  p("M13.4 10.6a4 4 0 0 0-5.7 0l-2.5 2.5a4 4 0 1 0 5.7 5.7l1.2-1.2"),
];
ICONS["list-ordered"] = [
  p("M9.5 6.5h11M9.5 12h11M9.5 17.5h11"),
  p("M4 5.2h1.2v3.3"),
  p("M3.6 12.2a1.3 1.3 0 0 1 2.2.9c0 .8-2.2 1.6-2.2 2.4h2.4"),
];

/** Alternatif adlar → kayıt defteri anahtarı. */
export const ICON_ALIASES: Record<string, string> = {
  // lucide adı → kebab anahtar (aynı geometri, farklı isim)
  Globe2: "globe",
  BarChart: "bar-chart2",
  BarChart3: "bar-chart2",
  CheckCircle2: "check-circle",
  Clock3: "clock",
  Loader2: "loader",
  Link2: "link2",
  Code: "code",
  User2: "user",
  ShieldCheck: "shield-check",
  ShieldX: "shield-x",
  XCircle: "x-circle",
  MessageSquare: "message-square",
  Filter: "filter",
  List: "list",
  ListOrdered: "list-ordered",
  Menu: "menu",
  Minus: "minus",
  Save: "save",
  // Tema/bağlam farkı gözetmeksizin aynı görsel karşılık
  Trash: "trash2",
  LoaderCircle: "loader",
  // Kebab-case varyantlar (DB `badgeIcon` / eski kebab adlar da çözülsün)
  link: "link2",
  "check-circle2": "check-circle",
  clock3: "clock",
  loader2: "loader",
  globe2: "globe",
  barChart2: "bar-chart2",
};

/** PascalCase / kebab / camel adlarını kayıt defteri anahtarına indirger. */
export function toIconKey(name: string): string {
  if (ICON_ALIASES[name]) return ICON_ALIASES[name];
  const kebab = name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
  if (ICONS[kebab]) return kebab;
  if (ICONS[name]) return name;
  return "globe";
}

export const FALLBACK_ICON = "globe";

/** Kayıt defterinde tanımlı tüm ikon adları (dokümantasyon/test için). */
export const ICON_NAMES = Object.keys(ICONS).sort();
