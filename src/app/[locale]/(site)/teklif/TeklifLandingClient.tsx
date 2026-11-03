"use client";

/**
 * TeklifLandingClient — `/teklif` kök sayfasının istemci gövdesi.
 *
 * Sitedeki tüm "Teklif Al" CTA'ları `/teklif`'e link verir. Bu rota daha önce
 * tanımlı olmadığı için 404 dönüyordu (hem kullanıcı hem tarama bütçesi sorunu).
 * Sayfa artık gerçek içerik gösterir ve JS varsa teklif formunu (modal)
 * otomatik açar; JS yoksa ziyaretçi için okunabilir içerik + iletişim yolları
 * kalır. Böylece "boş ama 200" (soft 404) bir sayfa oluşmaz.
 */

import { useEffect } from "react";
import Link from "next/link";
import XipIcon from "@/components/Ui/Icon";
import { teklifModal } from "@/components/Common/TeklifModal/teklif-modal-store";
import { BRAND, BRAND_COLORS } from "@/config/brand.config";

const GUARANTEES = [
  "Ücretsiz ihtiyaç & teknik analiz",
  "Sabit fiyatlı teklif — sürpriz maliyet yok",
  "Teslim sonrası 7/24 destek",
];

export default function TeklifLandingClient() {
  const ACCENT = BRAND_COLORS.primary;
  const SECONDARY = BRAND_COLORS.secondary;

  useEffect(() => {
    // Doğrudan /teklif'e gelen kullanıcı için formu hemen aç.
    teklifModal.open();
  }, []);

  return (
    <section
      aria-labelledby="teklif-title"
      className="mx-auto max-w-3xl px-4 py-16 text-center"
    >
      <p
        className="mb-4 text-xs font-bold uppercase tracking-[0.3em]"
        style={{ color: SECONDARY }}
      >
        Ücretsiz Teklif
      </p>

      <h1
        id="teklif-title"
        className="mb-4 text-3xl font-black leading-tight text-white md:text-4xl"
      >
        Projeniz için ücretsiz teklif alın
      </h1>

      <p className="mx-auto mb-8 max-w-xl leading-relaxed text-zinc-400">
        İhtiyacınızı kısaca anlatın; teknik analizinizi yapıp sabit fiyatlı,
        sürpriz maliyeti olmayan teklifimizi en kısa sürede iletelim.
      </p>

      <div className="mb-10 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={() => teklifModal.open()}
          className="site-cta-primary group inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold shadow-[0_6px_20px_rgba(167, 139, 250,0.14)] transition-all duration-200 hover:-translate-y-0.5"
        >
          Teklif Formunu Aç
          <XipIcon name="arrow-right" glow="strong" halo="red" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>

        <a
          href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(
            "Merhaba, projem için teklif almak istiyorum.",
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-emerald-100 transition-all duration-300 hover:scale-[1.03]"
          style={{
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(52,211,153,0.30)",
          }}
        >
          <XipIcon name="message-circle" glow="soft" className="h-4 w-4" />
          WhatsApp&apos;tan Yazın
        </a>
      </div>

      <ul className="mx-auto mb-10 flex max-w-xl flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8">
        {GUARANTEES.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
            <XipIcon name="check-circle" glow="soft" className="h-4 w-4 shrink-0" style={{ color: SECONDARY }} />
            {item}
          </li>
        ))}
      </ul>

      <p className="text-sm leading-relaxed text-zinc-500">
        Formu kullanmak istemezseniz{" "}
        <Link href="/contact-us" className="text-cyan-300 hover:underline">
          iletişim sayfamızdan
        </Link>{" "}
        bize ulaşabilir veya{" "}
        <a href={`mailto:${BRAND.email}`} className="inline-flex items-center gap-1 text-cyan-300 hover:underline">
          <XipIcon name="mail" glow="none" className="h-3.5 w-3.5" />
          {BRAND.email}
        </a>{" "}
        adresine yazabilirsiniz.
      </p>
    </section>
  );
}
