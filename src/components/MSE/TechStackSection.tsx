"use client";

import { useTranslations } from "next-intl";
import { PALETTE } from "@/config/palette";
import IceButton from "@/components/Ui/IceButton/IceButton";
import TitleText from "@/components/Common/TitleText/TitleText";
import XipIcon from "@/components/Ui/Icon";

// ─── Renk Sabitleri ────────────────────────────────────────────────────────
const V = PALETTE.neon[500];
const C = PALETTE.accent.cyan;

// ─── Teknoloji Yığını Veri Yapısı (Büyük Kart + Rozet Odaklı) ───────────────
interface TechCardData {
  name: string;
  badge: string;
  svgIcon: React.ReactNode;
}

interface TechCategory {
  title: string;
  color: string;
  items: TechCardData[];
}

const TECH_CATEGORIES: TechCategory[] = [
  {
    title: "MOBİL",
    color: V,
    items: [
      {
        name: "Flutter",
        badge: "Pixel-perfect UI",
        svgIcon: (
          <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.314 0L2.3 12 6.1 15.8 21.9 0h-7.586z" fill="#54C5F8" />
            <path d="M14.214 11.2L8.5 16.9l3.8 3.8 3.8-3.8 3.8 3.8 3.8-3.8-9.486-5.7z" fill="#01579B" />
            <path d="M12.3 20.7l3.8 3.3h7.6l-7.6-7.1-3.8 3.8z" fill="#29B6F6" />
          </svg>
        ),
      },
      {
        name: "React Native",
        badge: "Native UI",
        svgIcon: (
          <svg className="w-16 h-16" viewBox="-11.5 -10.23174 23 20.46348" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="0" cy="0" r="2.05" fill="#61DAFB" />
            <g stroke="#61DAFB" strokeWidth="1" fill="none">
              <ellipse rx="11" ry="4.2" />
              <ellipse rx="11" ry="4.2" transform="rotate(60)" />
              <ellipse rx="11" ry="4.2" transform="rotate(120)" />
            </g>
          </svg>
        ),
      },
    ],
  },
  {
    title: "FRONTEND",
    color: C,
    items: [
      {
        name: "Next.js",
        badge: "App Router & ISR",
        svgIcon: (
          <svg className="w-16 h-16 text-white" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="90" cy="90" r="85" fill="black" stroke="white" strokeWidth="6" />
            <path d="M149.508 157.52L69.017 54H54V126H67.5V70.898L136.2 159.208C140.916 158.858 145.36 158.28 149.508 157.52Z" fill="white" />
            <path d="M115.5 54H129V126H115.5V54Z" fill="white" />
          </svg>
        ),
      },
      {
        name: "React",
        badge: "Server Components",
        svgIcon: (
          <svg className="w-16 h-16" viewBox="-11.5 -10.23174 23 20.46348" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="0" cy="0" r="2.05" fill="#61DAFB" />
            <g stroke="#61DAFB" strokeWidth="1" fill="none">
              <ellipse rx="11" ry="4.2" />
              <ellipse rx="11" ry="4.2" transform="rotate(60)" />
              <ellipse rx="11" ry="4.2" transform="rotate(120)" />
            </g>
          </svg>
        ),
      },
    ],
  },
  {
    title: "BACKEND",
    color: V,
    items: [
      {
        name: "Node.js",
        badge: "High-throughput API",
        svgIcon: (
          <svg className="w-16 h-16" viewBox="0 0 256 289" xmlns="http://www.w3.org/2000/svg">
            <path fill="#5FA04E" d="M128 0L0 73.9v141.2L128 289l128-73.9V73.9L128 0z" />
          </svg>
        ),
      },
      {
        name: "Python",
        badge: "AI & Fast Processing",
        svgIcon: (
          <svg className="w-16 h-16" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
            <path fill="#3776AB" d="M63.2 2c-15.5 0-24.8 6.8-24.8 20.1v14.7h25.3v3.6H17.8C4.7 40.4 0 48.9 0 64.3c0 15.2 5.1 23.9 18.2 23.9h10.8V74.8c0-14.8 12.6-27.1 27.6-27.1h25.1V22.1C81.7 8.8 78.7 2 63.2 2z" />
            <path fill="#FFD43B" d="M64.8 126c15.5 0 24.8-6.8 24.8-20.1V91.2H64.3v-3.6h25.9c13.1 0 17.8-8.5 17.8-23.9 0-15.2-5.1-23.9-18.2-23.9H99v13.4c0 14.8-12.6 27.1-27.6 27.1H46.3v25.6c0 13.3 3 20.1 18.5 20.1z" />
          </svg>
        ),
      },
    ],
  },
];

/**
 * Şerit verisi: kategori kartları TEK sıraya düzleştirilir. Akış artık grup
 * satırları hâlinde değil, yan yana sağdan sola aktığı için kategori başlığı ve
 * rengi her kartın üstündeki rozete taşınır (grup bilgisi kaybolmaz).
 */
type TechStripItem = TechCardData & { category: string; color: string };

const TECH_STRIP: TechStripItem[] = TECH_CATEGORIES.flatMap((category) =>
  category.items.map((item) => ({
    ...item,
    category: category.title,
    color: category.color,
  })),
);

// ─── Teknoloji Kart Bileşeni ────────────────────────────────────────────────
function BigTechCard({ item }: { item: TechStripItem }) {
  const { color } = item;

  return (
    <div
      className="home-liquid-glass tech-card-reveal group relative flex w-[248px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/[0.09] px-6 pb-8 pt-14 text-center shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-white/20 sm:w-[268px]"
      style={{
        background: `radial-gradient(ellipse at 50% 110%, ${color}12, transparent 65%), linear-gradient(145deg, rgba(255,255,255,0.045), rgba(9,10,24,0.84) 70%)`,
      }}
    >
      {/* Kategori Rozeti — grup başlığı şeride taşındı */}
      <span
        className="absolute left-5 top-5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
        style={{ color, background: `${color}14`, border: `1px solid ${color}33` }}
      >
        {item.category}
      </span>

      {/* Üst Vurgu Çizgisi */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      {/* Arka Plan Glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none rounded-3xl"
        style={{ background: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 70%)` }}
      />

      {/* İkon / Logo */}
      <div className="relative mb-4 transform transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] [&_svg]:h-14 [&_svg]:w-14 sm:[&_svg]:h-16 sm:[&_svg]:w-16">
        {item.svgIcon}
      </div>

      {/* Teknoloji Başlığı */}
      <h3 className="text-xl font-bold text-white mb-3 tracking-tight sm:text-2xl">
        {item.name}
      </h3>

      {/* Onay Rozeti */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-mono text-zinc-300">
        <XipIcon name="check-circle" glow="soft" className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{item.badge}</span>
      </div>
    </div>
  );
}

// ─── Ana Bölüm ──────────────────────────────────────────────────────────────
export default function TechStackSection() {
  const t = useTranslations("home.techStack");

  // Sabit hız: kart başına ~4,5 sn (en yavaş 28 sn) — `TechMarquee` ile aynı kural.
  const durationSeconds = Math.max(28, TECH_STRIP.length * 4.5);

  return (
    <section className="py-16 lg:py-24 relative">
      {/* Başlık */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center mb-16 home-reveal">
        <TitleText tag="h2" variant="brand" className="mb-4">
          TEKNOLOJİ YIĞINIMIZ
        </TitleText>
        <p className="text-ink-muted text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Endüstri standardı araçlarla, projenize en uygun teknolojiyi seçiyor ve uyguluyoruz.
        </p>
      </div>

      {/* ── TEKNOLOJİ ŞERİDİ ───────────────────────────────────────────────────
          Kartlar yan yana TEK sırada durur ve sağdan sola sonsuz akar.
          Akış saf CSS (`animate-tech-marquee`, bkz. tailwind.config.ts): JS
          timer/kuyruk yok → ana thread boş kalır, içerik JS kapalıyken de akar.
          Track iki kopyadan oluşur ve -50% kaydırılır → dikişsiz döngü; kopya
          `aria-hidden` olduğu için ekran okuyucu içeriği BİR KEZ duyar.
          Üzerine gelince akış durur; incelemek isteyen okumaya devam edebilir.
          ≤768px'te globals.scss tüm animasyonları söndürür → şerit sarılı
          statik ızgaraya döner ve kopya gizlenir (aksi hâlde taşan kartlar
          erişilmez kalırdı). Tam genişlik (full-bleed) için üst kapsayıcıda
          `overflow-hidden` YOKTUR; kırpma şeridin kendi kabında yapılır. */}
      <div className="relative ml-[50%] w-screen -translate-x-1/2 overflow-hidden">
        {/* DİKKAT: track'te `gap` YOK. İki kopya kendi iç boşluğunu (`gap-6`) ve
            aradaki boşluğu (`pr-6`) taşır; track'e gap eklenirse -50% kaydırma
            bir turu tam kapatmaz ve her döngüde ~12px zıplama olur. */}
        <div
          className="flex w-max animate-tech-marquee py-2 hover:[animation-play-state:paused] max-md:w-full max-md:flex-wrap max-md:justify-center max-md:animate-none motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:animate-none motion-reduce:justify-center"
          style={{ animationDuration: `${durationSeconds}s` }}
        >
          <div className="flex shrink-0 gap-6 pr-6 max-md:w-full max-md:flex-wrap max-md:justify-center">
            {TECH_STRIP.map((item) => (
              <BigTechCard key={item.name} item={item} />
            ))}
          </div>

          {/* Kopya şerit — yalnızca dikişsiz akış için. */}
          <div
            aria-hidden="true"
            className="flex shrink-0 gap-6 pr-6 max-md:hidden motion-reduce:hidden"
          >
            {TECH_STRIP.map((item) => (
              <BigTechCard key={`echo-${item.name}`} item={item} />
            ))}
          </div>
        </div>

        {/* Kenar solmaları: kartlar viewport kenarında sert kesilmesin.
            Sarılı (mobil / reduced-motion) modda içeriği kestikleri için kapalı. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 max-md:hidden"
          style={{ background: "linear-gradient(90deg, #050811 0%, rgba(5, 8, 17,0) 100%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 max-md:hidden"
          style={{ background: "linear-gradient(270deg, #050811 0%, rgba(5, 8, 17,0) 100%)" }}
        />
      </div>

      {/* Alt CTA */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center mt-16 text-ink-muted text-sm md:text-base home-reveal flex flex-col sm:flex-row items-center justify-center gap-3">
        <IceButton label="ücretsiz teklif alın" size="sm" className="inline-flex" />
      </div>

      {/* Arka Plan Ortam Işığı */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none blur-[140px] opacity-20"
        style={{ background: V }}
      />
    </section>
  );
}
