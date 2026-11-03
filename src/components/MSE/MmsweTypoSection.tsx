"use client";

import { useTranslations } from "next-intl";

/**
 * Marka lock-up'ı.
 *
 * ÖNCE: krom/metalik dolgu + speküler parlaklık katmanı + ayna yansıması +
 * arkada dev "hayalet" kelime. Bu, obsidyen + tek renk vurgu dilini bozuyor;
 * üstelik dev `drop-shadow`, ebeveynin `overflow:hidden`'ı ile kesilip başlığın
 * arkasında sert bir dikdörtgen leke çiziyordu.
 *
 * Şimdi tek kural: net tipografi, tek kılcal çizgi — başlık kırık beyaz,
 * çizgi ve mavi vurgu markanın ana aksanından gelir.
 */
export default function MmsweTypoSection() {
  const t = useTranslations("XipSoftTypo");

  return (
    <div className="relative flex w-full flex-col items-center justify-center px-4 py-20">
      <span
        className="home-reveal select-none font-display text-[clamp(3.5rem,12vw,8.5rem)] font-extrabold leading-none tracking-[-0.02em] text-neon-fg"
        style={{ textShadow: "0 0 48px rgba(167, 139, 250,0.12)" }}
      >
        XipSoft
      </span>

      <span
        aria-hidden="true"
        className="home-reveal mt-7 block h-px w-[min(70%,420px)]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(167, 139, 250,0.45), transparent)",
        }}
      />

      <h2 className="home-reveal mt-5 text-center font-display text-[clamp(0.75rem,2vw,1.05rem)] font-semibold uppercase leading-none tracking-[0.3em] text-neon">
        {t("sloganTitle")}
      </h2>
    </div>
  );
}
