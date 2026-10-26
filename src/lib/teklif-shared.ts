/**
 * teklif-shared.ts — Teklif akışının SAF (DB'siz) yardımcıları.
 *
 * Bu dosya hem sunucu hem istemci (client component) tarafından import edilir;
 * bu yüzden burada `pg`/pool importu YAPILMAZ. DB erişimi `@/lib/db/teklif`
 * içindedir, ortak tipler ve biçimlendirme buradan gelir (tek kaynak).
 */

// ── Durumlar ────────────────────────────────────────────────────────────────

export type TeklifStatus =
  | "pending"
  | "quoted"
  | "rejected"
  | "payment_reported"
  | "paid"
  | "in_progress"
  | "completed";

export interface TeklifItem {
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export interface TeklifEvent {
  status: TeklifStatus;
  note: string | null;
  created_at: string;
}

/** Müşteriye gösterilen (notsuz) aşama kaydı. */
export interface PublicTeklifEvent {
  status: TeklifStatus;
  created_at: string;
}

/** İstemciye gönderilen güvenli teklif görünümü (e-posta maskeli). */
export interface PublicTeklif {
  status: TeklifStatus;
  name: string;
  service: string;
  detail: string | null;
  email: string;
  price: string | null;
  payment_method: string | null;
  payment_url: string | null;
  reference_code: string;
  items: TeklifItem[];
  created_at: string;
  payment_reported_at: string | null;
  paid_at: string | null;
}

/** Admin listelerinde gördüğü tam kayıt (maskesiz). */
export interface Teklif {
  id: number;
  token: string;
  reference_code: string | null;
  name: string;
  email: string;
  phone: string | null;
  service: string;
  detail: string | null;
  status: TeklifStatus;
  price: string | null;
  payment_method: string | null;
  payment_url: string | null;
  items: TeklifItem[];
  paid_at: string | null;
  payment_reported_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Aşama (süreç takibi) tanımları ──────────────────────────────────────────

export const TEKLIF_STAGES: Array<{ status: TeklifStatus; label: string; description: string }> = [
  { status: "pending", label: "Talep Alındı", description: "Teklif talebiniz bize ulaştı." },
  { status: "quoted", label: "Teklif Hazırlandı", description: "Kapsam ve fiyat hazır. Ödemeye geçebilirsiniz." },
  { status: "payment_reported", label: "Ödeme Bildirildi", description: "Havale/EFT bildiriminiz alındı, kontrol ediliyor." },
  { status: "paid", label: "Ödeme Onaylandı", description: "Ödemeniz doğrulandı." },
  { status: "in_progress", label: "Proje Başladı", description: "Ekibimiz projeniz üzerinde çalışmaya başladı." },
  { status: "completed", label: "Tamamlandı", description: "Proje tamamlandı ve teslim edildi." },
];

export const TEKLIF_STATUS_META: Record<TeklifStatus, { label: string; tone: string }> = {
  pending: { label: "Bekliyor", tone: "warn" },
  quoted: { label: "Teklif Verildi", tone: "info" },
  rejected: { label: "Teklif Verilmedi", tone: "danger" },
  payment_reported: { label: "Ödeme Bildirildi", tone: "info" },
  paid: { label: "Ödeme Onaylandı", tone: "success" },
  in_progress: { label: "Proje Başladı", tone: "info" },
  completed: { label: "Tamamlandı", tone: "success" },
};

/** `TEKLIF_STAGES` içindeki mevcut aşamanın indeksi (rejected → -1). */
export function stageIndex(status: TeklifStatus): number {
  return TEKLIF_STAGES.findIndex((stage) => stage.status === status);
}

// ── Biçimlendirme / türetme yardımcıları ────────────────────────────────────

const TRY_FORMATTER = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

/** `"12500.00"` veya `12500` → `12500` (geçersiz/boş → 0). */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatTry(value: string | number | null | undefined): string {
  return TRY_FORMATTER.format(toNumber(value));
}

export function itemTotal(item: TeklifItem): number {
  return toNumber(item.quantity) * toNumber(item.unitPrice);
}

export function teklifItemsTotal(items: TeklifItem[]): number {
  return items.reduce((sum, item) => sum + itemTotal(item), 0);
}

/**
 * Teklifin kalem listesi. DB'de kayıtlı kalem varsa onu kullanır; yoksa
 * (eski kayıtlar / yalnızca toplam fiyat girilmiş teklifler) hizmet + tutardan
 * tek satırlık kalem türetir. Böylece şema değişikliği geriye dönük uyumlu kalır.
 */
export function resolveTeklifItems(input: {
  items?: TeklifItem[] | null;
  service: string;
  detail?: string | null;
  price?: string | number | null;
}): TeklifItem[] {
  const items = (input.items ?? []).filter(
    (item): item is TeklifItem => Boolean(item && item.title),
  );
  if (items.length > 0) return items;

  if (input.service) {
    return [
      {
        title: input.service,
        description: input.detail?.trim() || undefined,
        quantity: 1,
        unitPrice: toNumber(input.price),
      },
    ];
  }

  return [];
}

/** `XIP-` + token'ın ilk 8 alfanumerik karakteri (deterministik, tekil). */
export function buildReferenceCode(token: string): string {
  return `XIP-${token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

/** Havale açıklamasına yazılacak kod: `XIP-[TOKEN_KREDI]`. */
export function teklifReferenceCode(teklif: Pick<Teklif, "token" | "reference_code">): string {
  return teklif.reference_code || buildReferenceCode(teklif.token);
}

/** Token formatı — geçersiz/çok kısa token'lar DB'ye hiç ulaşmaz. */
export const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{20,128}$/;

export function isValidToken(token: string | null | undefined): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

/** Token sahibi kendi e-postasını bilir; token sızarsa tam adres ifşa olmaz. */
export function maskEmail(rawEmail: string | null | undefined): string {
  const email = rawEmail ?? "";
  const atIdx = email.indexOf("@");
  if (atIdx <= 1) return email;
  return `${email[0]}${"*".repeat(Math.max(atIdx - 2, 1))}${email[atIdx - 1]}${email.slice(atIdx)}`;
}

/** Düz kayıt → istemciye/müşteriye gönderilecek güvenli görünüm. */
export function toPublicTeklif(teklif: Teklif): PublicTeklif {
  return {
    status: teklif.status,
    name: teklif.name,
    service: teklif.service,
    detail: teklif.detail,
    email: maskEmail(teklif.email),
    price: teklif.price,
    payment_method: teklif.payment_method,
    payment_url: teklif.payment_url,
    reference_code: teklifReferenceCode(teklif),
    items: resolveTeklifItems({
      items: teklif.items,
      service: teklif.service,
      detail: teklif.detail,
      price: teklif.price,
    }),
    created_at: teklif.created_at,
    payment_reported_at: teklif.payment_reported_at,
    paid_at: teklif.paid_at,
  };
}
