import type { Metadata } from "next";
import "@/styles/lab/tbg-12.css";

/**
 * LAB — tbg-12 önizlemesi (KISMİ teslim).
 *
 * Elimizde yalnızca tema katmanı var: renk/gölge/font token'ları ve
 * tbg12-sheen / tbg12-glint / tbg12-sq1-3 keyframe'leri. Bileşenin kendi
 * kuralları (track / thumb / sheen / glint / squeeze uygulamaları) ve
 * markup'ı gelmediği için bu sayfa "gelen katmanı" görünür kılıyor:
 * token'lar + animasyonlar.
 */

export const metadata: Metadata = {
  title: "tbg-12 · Tema katmanı (kısmi)",
  robots: { index: false, follow: false },
};

const COLOR_TOKENS: Array<[string, string]> = [
  ["--color-tbg12-bg", "zemin"],
  ["--color-tbg12-well", "yuva"],
  ["--color-tbg12-glow", "ışıma"],
  ["--color-tbg12-line", "çizgi"],
  ["--color-tbg12-ink", "metin"],
  ["--color-tbg12-mut", "soluk metin"],
  ["--color-tbg12-on", "aktif"],
  ["--color-tbg12-focus", "odak"],
];

const MISSING = [
  "Bileşenin kendi kuralları: track / well / thumb ölçü ve geçişleri",
  "sheen, glint ve sq1-3 animasyonlarının elemanlara bağlandığı kurallar",
  "Markup (hangi eleman hangi sınıfı alıyor) ve varsa JS davranışı",
  "Familjen Grotesk fontu — şu an `system-ui` yedeğine düşüyor",
];

export default function LabTbg12Page() {
  return (
    <main className="min-h-screen bg-[#050811] px-6 py-24 text-zinc-200">
      <div className="mx-auto max-w-3xl">
        <span className="-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          XipSoft · iç önizleme
        </span>
        <h1 className="-display mt-2 text-2xl font-bold text-white">tbg-12 — tema katmanı</h1>

        {/* Uyarı */}
        <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-4">
          <p className="text-sm font-semibold text-amber-200">
            Bu teslim kısmi: yalnızca token + keyframe katmanı var.
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-200/80">
            Gönderilen dosya Tailwind v4 söz dizimi kullanıyordu (<code>@import &quot;tailwindcss&quot;</code> +{" "}
            <code>@theme</code>); proje v3.3 olduğu için{" "}
            <code>:root</code> değişkenleri + kök seviyede <code>@keyframes</code> karşılığına çevrildi
            (<code>src/styles/lab/tbg-12.css</code>). Değerler birebir korundu.
          </p>
        </div>

        {/* Renk token'ları */}
        <h2 className="-display mt-10 text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
          Renk token&apos;ları
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLOR_TOKENS.map(([variable, label]) => (
            <li
              key={variable}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
            >
              <span
                aria-hidden="true"
                className="block h-12 w-full rounded-lg border border-white/10"
                style={{ background: `var(${variable})` }}
              />
              <span className="mt-2 block text-[11px] font-semibold text-zinc-300">{label}</span>
              <code className="mt-0.5 block break-all text-[10px] text-zinc-500">{variable}</code>
            </li>
          ))}
        </ul>

        {/* Gölge token'ı */}
        <h2 className="-display mt-10 text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
          Thumb gölgesi
        </h2>
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <span
            aria-hidden="true"
            className="block h-12 w-12 rounded-2xl"
            style={{
              background: "var(--color-tbg12-ink)",
              boxShadow: "var(--shadow-tbg12-thumb)",
            }}
          />
          <code className="text-[11px] text-zinc-500">--shadow-tbg12-thumb</code>
        </div>

        {/* Animasyonlar */}
        <h2 className="-display mt-10 text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
          Anahtar kareler
        </h2>
        <ul className="mt-4 grid gap-3">
          <li className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <span className="block text-[11px] font-semibold text-zinc-300">
              tbg12-sheen · conic açı döngüsü (5s)
            </span>
            <span
              aria-hidden="true"
              className="mt-3 block h-20 w-full rounded-xl"
              style={{
                background:
                  "conic-gradient(from var(--tbg12-sheen), var(--color-tbg12-well), var(--color-tbg12-glow), var(--color-tbg12-ink), var(--color-tbg12-well))",
                animation: "var(--animate-tbg12-sheen)",
              }}
            />
          </li>
          <li className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <span className="block text-[11px] font-semibold text-zinc-300">
              tbg12-glint · ışık süpürmesi (5s)
            </span>
            <span
              aria-hidden="true"
              className="mt-3 block h-14 w-full overflow-hidden rounded-xl"
              style={{ background: "var(--color-tbg12-well)" }}
            >
              <span
                className="block h-full w-full"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.42) 50%, transparent 65%)",
                  animation: "var(--animate-tbg12-glint)",
                }}
              />
            </span>
          </li>
          <li className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <span className="block text-[11px] font-semibold text-zinc-300">
              tbg12-sq1 / sq2 / sq3 · sıkışma (0.5s)
            </span>
            <span className="mt-3 flex gap-3">
              {[
                ["var(--animate-tbg12-sq1)", "sq1"],
                ["var(--animate-tbg12-sq2)", "sq2"],
                ["var(--animate-tbg12-sq3)", "sq3"],
              ].map(([animation, label]) => (
                <span
                  key={label}
                  aria-hidden="true"
                  className="flex h-14 w-14 items-center justify-center rounded-xl text-[10px] font-bold text-[var(--color-tbg12-ink)]"
                  style={{ background: "var(--color-tbg12-glow)", animation }}
                >
                  {label}
                </span>
              ))}
            </span>
            <span className="mt-2 block text-[10px] text-zinc-500">
              Üçü kaynakta birebir aynı; ayrı ayrı tanımlı oldukları için ayrı tutuldu.
            </span>
          </li>
        </ul>

        {/* Eksikler */}
        <h2 className="-display mt-10 text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
          Entegrasyon için eksik olanlar
        </h2>
        <ul className="mt-4 grid gap-2 text-xs leading-relaxed text-zinc-400">
          {MISSING.map((item) => (
            <li key={item} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
