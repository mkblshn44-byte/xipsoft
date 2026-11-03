"use client";
/**
 * LAB — lg-04 · Fiyatlandırma tablosu (kullanıcı teslimi bileşen)
 *
 * Kullanıcının verdiği CSS (`src/styles/lab/lg-04.css`) HİÇ değiştirilmedi;
 * bu bileşen yalnızca o dosyanın beklediği sınıf sözleşmesini uygular:
 *
 *   .lg-04__switch[aria-checked="true|false"]  → thumb'ı kaydırır, track'i boyar
 *   .lg-04__grid[data-cycle="month|year"]      → .m / .y fiyatlarını seçer
 *   .lg-04__plan--pop::before                  → animasyonlu conic kenarlık (--spin)
 *
 * Markup kaynakta verilmediği için iskelet, CSS'teki sınıf adlarından ve
 * seçicilerden birebir çıkarıldı. İçerik (plan adları/fiyatlar) örnek veridir.
 */

import { useState } from "react";

type Plan = {
  id: string;
  name: string;
  monthly: string;
  yearly: string;
  features: string[];
  cta: string;
  /** Öne çıkan plan → conic kenarlık + "EN POPÜLER" rozeti */
  pop?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "baslangic",
    name: "Başlangıç",
    monthly: "29.900",
    yearly: "299.000",
    features: [
      "1 aktif proje",
      "Landing page + temel SEO",
      "E-posta desteği (48 saat)",
      "Aylık performans raporu",
    ],
    cta: "Planı seç",
  },
  {
    id: "profesyonel",
    name: "Profesyonel",
    monthly: "59.900",
    yearly: "599.000",
    features: [
      "3 aktif proje",
      "Özel yazılım + entegrasyonlar",
      "Öncelikli destek (8 saat)",
      "Haftalık sprint toplantısı",
      "SEO + analitik kurulumu",
    ],
    cta: "Planı seç",
    pop: true,
  },
  {
    id: "kurumsal",
    name: "Kurumsal",
    monthly: "129.900",
    yearly: "1.299.000",
    features: [
      "Sınırsız proje",
      "Özel ekip (4+ kişi)",
      "7/24 kritik destek",
      "Güvenlik denetimi + sızma testi",
      "SLA sözleşmesi",
    ],
    cta: "Bize ulaşın",
  },
];

export default function Lg04Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="lg-04">
      {/* ── Aylık / yıllık anahtarı ── */}
      <div className="lg-04__head">
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          aria-label={
            yearly
              ? "Yıllık ödeme açık, aylık ödemeye geç"
              : "Aylık ödeme açık, yıllık ödemeye geç"
          }
          className="lg-04__switch"
          onClick={() => setYearly((v) => !v)}
        >
          <span className="lg-04__track">
            <span className="lg-04__thumb" />
          </span>
          <span>{yearly ? "Yıllık ödeme" : "Aylık ödeme"}</span>
        </button>
      </div>

      {/* ── Planlar: data-cycle fiyat metinlerini değiştirir ── */}
      <div className="lg-04__grid" data-cycle={yearly ? "year" : "month"}>
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className={plan.pop ? "lg-04__plan lg-04__plan--pop" : "lg-04__plan"}
          >
            {plan.pop && <span className="lg-04__badge">EN POPÜLER</span>}

            <h3>{plan.name}</h3>

            <div className="lg-04__price">
              <span className="m">₺{plan.monthly}</span>
              <span className="y">₺{plan.yearly}</span>
              <small>/ {yearly ? "yıl" : "ay"}</small>
            </div>

            <ul className="lg-04__feat">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <a
              className={plan.pop ? "lg-04__cta lg-04__cta--pop" : "lg-04__cta"}
              href="#"
              onClick={(event) => event.preventDefault()}
            >
              {plan.cta}
            </a>
          </article>
        ))}
      </div>

      <p className="lg-04__live">
        {yearly
          ? "Yıllık ödeme · 2 ay bedava (≈ %17 indirim)"
          : "Aylık ödeme · dilediğin an iptal"}
      </p>
    </div>
  );
}
