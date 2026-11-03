/**
 * payment.config.ts — Havale/EFT banka bilgileri için TEK kaynak.
 *
 * Daha önce teklif detayı `NEXT_PUBLIC_BANK_*`, ödeme sayfası ise
 * `NEXT_PUBLIC_PAYMENT_*` değişkenlerini okuyordu; ikisi ayrı tutuluyordu.
 * Artık her ikisi de buradan beslenir (ikinci kopya yok).
 *
 * NEXT_PUBLIC_* değişkenleri build sırasında statik olarak gömüldüğü için
 * burada yalnızca literal `process.env.NEXT_PUBLIC_*` erişimleri kullanılır.
 */

export const PAYMENT_BANK = {
  bankName:
    process.env.NEXT_PUBLIC_PAYMENT_BANK_NAME ||
    process.env.NEXT_PUBLIC_BANK_NAME ||
    "Ziraat Bankası",
  iban:
    process.env.NEXT_PUBLIC_PAYMENT_IBAN ||
    process.env.NEXT_PUBLIC_BANK_IBAN ||
    "",
  accountName:
    process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME ||
    process.env.NEXT_PUBLIC_BANK_HOLDER ||
    "XipSoft Yazılım ve Teknoloji Sistemleri",
} as const;

/** IBAN girilmemişse IBAN bloğu gösterilmez. */
export const hasBankDetails = PAYMENT_BANK.iban.length > 0;
