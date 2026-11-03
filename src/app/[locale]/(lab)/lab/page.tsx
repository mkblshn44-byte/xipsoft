import Link from "next/link";

/** LAB — önizleme dizini. */

const DEMOS = [
  {
    href: "/lab/lg-04",
    id: "lg-04",
    title: "Fiyatlandırma tablosu",
    note: "Aylık/yıllık geçiş anahtarı, 3 plan; öne çıkan kartta animasyonlu (conic) kenarlık, anahtarda yay eğrisiyle kayan thumb.",
    status: "hazır",
  },
  {
    href: "/lab/tbg-12",
    id: "tbg-12",
    title: "Anahtar / toggle — yalnızca tema katmanı",
    note: "Token ve keyframe katmanı geldi (tbg12-sheen / glint / sq1-3). Bileşenin kendi kuralları ve markup'ı bekleniyor.",
    status: "eksik",
  },
] as const;

export default function LabIndexPage() {
  return (
    <main className="min-h-screen bg-[#050811] px-6 py-24 text-zinc-200">
      <div className="mx-auto max-w-3xl">
        <span className="-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          XipSoft · iç önizleme
        </span>
        <h1 className="-display mt-2 text-2xl font-bold text-white">Bileşen Laboratuvarı</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Teslim alınan bileşenlerin canlı önizlemeleri. Bileşen CSS&apos;leri olduğu gibi
          kullanılır; bu sayfalar arama motorlarına kapalıdır.
        </p>

        <ul className="mt-8 grid gap-3">
          {DEMOS.map((demo) => (
            <li key={demo.id}>
              <Link
                href={demo.href}
                className="group flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <span className="min-w-0">
                  <span className="-mono block text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    {demo.id}
                  </span>
                  <span className="-display mt-1 block text-sm font-bold text-white">
                    {demo.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
                    {demo.note}
                  </span>
                </span>
                <span
                  className={
                    demo.status === "hazır"
                      ? "shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300"
                      : "shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300"
                  }
                >
                  {demo.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
