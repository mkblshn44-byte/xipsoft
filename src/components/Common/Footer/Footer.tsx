"use client";

import Container from "@/components/Ui/Container/Container";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

/**
 * Footer bağlantıları — bilinçli olarak KISA tutulur.
 * Uzun kuyruk (ilçe/lokasyon, ikincil hizmetler) buradan çıkarıldı; bu linkler
 * kendi sayfalarından ve "Tüm Hizmetler" girişinden erişilebilir kalır.
 */
const SERVICE_LINKS = [
  ["Web Yazılım", "/hizmetler/web-yazilim-tasarim"],
  ["Mobil Uygulama", "/hizmetler/mobil-uygulama"],
  ["Yapay Zeka", "/hizmetler/yapay-zeka-ml"],
  ["Siber Güvenlik", "/hizmetler/siber-guvenlik"],
  ["SEO & Pazarlama", "/hizmetler/seo-dijital-pazarlama"],
  ["Tüm Hizmetler", "/hizmetler"],
] as const;

const COMPANY_LINKS = [
  ["Hakkımızda", "/hakkimizda"],
  ["Referanslar", "/references"],
  ["Blog", "/blog"],
  ["İletişim", "/contact-us"],
] as const;

const LEGAL_LINKS = [
  ["Gizlilik Politikası", "/privacy-policy"],
  ["Kullanım Şartları", "/terms-of-service"],
  ["Çerez Politikası", "/cookie-policy"],
] as const;

function FooterNav({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <nav aria-label={title}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-dim">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const Footer = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.15, once: true });

  return (
    <footer ref={ref} className="border-t border-edge bg-space-950">
      <Container className="relative z-10 py-14 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:gap-x-10"
        >
          {/* Marka */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="XipSoft ana sayfa" className="inline-block">
              <Image
                src="/media/logo.webp"
                alt="XipSoft"
                width={120}
                height={38}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              Kurumsal web tasarım, özel yazılım ve siber güvenlik çözümleri.
            </p>
          </div>

          {/* Link grupları */}
          <FooterNav title="Hizmetler" links={SERVICE_LINKS} />
          <FooterNav title="Kurumsal" links={COMPANY_LINKS} />

          {/* İletişim */}
          <nav aria-label="İletişim">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-dim">
              İletişim
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/contact-us"
                  className="text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
                >
                  Bize Ulaşın
                </Link>
              </li>
              <li>
                <Link
                  href="/teklif"
                  className="text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
                >
                  Teklif Al
                </Link>
              </li>
            </ul>
          </nav>
        </motion.div>

        {/* Alt bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-edge pt-6 sm:flex-row">
          <p className="text-xs text-ink-dim">© 2026 XipSoft · Tüm hakları saklıdır.</p>

          <nav aria-label="Yasal" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-ink-dim transition-colors duration-200 hover:text-ink-muted"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
