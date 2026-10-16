/**
 * SiteStarfield — tüm sitede görünen sabit (fixed) arka plan yıldız katmanı.
 *
 * Saf CSS (JS yok, WebGL yok, animasyon yok) → her sayfada çok ucuz.
 *
 * KATMAN SIRASI: İçerik ve kartların ARKASINDA kalır. `-z-10` + ebeveyn
 * `isolate` sayesinde opak sayfa zemininin (bg-space-950) ÜSTÜNDE, normal
 * akış içeriğinin ALTINDA çizilir. Yani zemin rengini korurken yıldızlar
 * tüm sayfada görünür.
 *
 * DİKEY GEÇİŞ: `mask-image` ile üstte tam görünür, aşağıya doğru yumuşakça
 * yok olur — ekranın alt kısmı koyu kalır (aşağı inildikçe arka plan sadeleşir).
 *
 * Hero kendi canlı WebGL sahnesini (SpaceCanvas) kullanır ve `bg-neon-bg`
 * ile opak olduğu için bu katmanla çakışmaz. Mobilde de görünür.
 */
export default function SiteStarfield() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 opacity-70"
      style={{
        // Farklı boyut/konumda tile'lanan 4 ince yıldız katmanı —
        // tek tek span/JS yerine tek bir gradyan yığını (paint maliyeti düşük).
        backgroundImage: [
          "radial-gradient(circle, rgba(255,255,255,0.95) 0 1px, transparent 1.7px)",
          "radial-gradient(circle, rgba(196,176,255,0.85) 0 1px, transparent 1.9px)",
          "radial-gradient(circle, rgba(103,232,249,0.70) 0 0.9px, transparent 1.7px)",
          "radial-gradient(circle, rgba(255,255,255,0.55) 0 1.4px, transparent 2.4px)",
        ].join(", "),
        backgroundSize: "90px 90px, 140px 140px, 190px 190px, 260px 260px",
        backgroundPosition: "18px 42px, 84px 12px, 40px 96px, 160px 70px",
        backgroundRepeat: "repeat",
        // Üstten tam, altta yok olacak şekilde dikey maske.
        WebkitMaskImage:
          "linear-gradient(to bottom, #000 0%, #000 30%, rgba(0,0,0,0.55) 60%, transparent 92%)",
        maskImage:
          "linear-gradient(to bottom, #000 0%, #000 30%, rgba(0,0,0,0.55) 60%, transparent 92%)",
      }}
    />
  );
}
