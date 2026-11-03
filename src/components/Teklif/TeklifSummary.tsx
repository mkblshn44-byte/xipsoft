"use client";

/**
 * TeklifSummary — teklif özeti + havale bloğu için paylaşılan parçalar.
 *
 * Hem `/teklif/[token]` (teklif detayı), hem `/odeme` (ödeme sayfası), hem de
 * `/takip/[token]` (süreç takibi) aynı kalem tablosunu ve IBAN/blok kodunu
 * gösterdiği için tek yerde tutulur (üç ayrı kopya yok).
 */

import { useCallback, useState } from "react";
import XipIcon from "@/components/Ui/Icon";
import {
  type TeklifItem,
  formatTry,
  itemTotal,
  teklifItemsTotal,
} from "@/lib/teklif-shared";
import { PAYMENT_BANK, hasBankDetails } from "@/config/payment.config";

/** Panoya kopyalama + 2 sn "kopyalandı" durumu (tek yardımcı). */
export function useCopy(resetMs = 2000) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string, key: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(key);
      setTimeout(() => setCopied(null), resetMs);
    },
    [resetMs],
  );

  return { copied, copy };
}

export function CopyButton({
  value,
  copyKey,
  copied,
  onCopy,
  label = "Kopyala",
}: {
  value: string;
  copyKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  label?: string;
}) {
  const isCopied = copied === copyKey;
  return (
    <button
      type="button"
      onClick={() => onCopy(value, copyKey)}
      title={isCopied ? "Kopyalandı" : label}
      aria-label={`${label}: ${value}`}
      className="shrink-0 rounded-lg p-2 transition-colors hover:bg-white/10"
    >
      {isCopied ? (
        <XipIcon name="check" className="h-4 w-4 text-emerald-400" />
      ) : (
        <XipIcon name="copy" className="h-4 w-4 text-zinc-400" />
      )}
    </button>
  );
}

/** Teklif kalemleri tablosu + toplam. */
export function TeklifItemsTable({ items }: { items: TeklifItem[] }) {
  const total = teklifItemsTotal(items);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Kalem</th>
            <th className="px-3 py-2.5 text-right font-medium">Adet</th>
            <th className="px-4 py-2.5 text-right font-medium">Tutar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/70">
          {items.map((item, index) => (
            <tr key={`${item.title}-${index}`}>
              <td className="px-4 py-3">
                <p className="font-medium text-zinc-100">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 whitespace-pre-line text-xs text-zinc-500">
                    {item.description}
                  </p>
                )}
              </td>
              <td className="px-3 py-3 text-right text-zinc-400">{item.quantity}</td>
              <td className="px-4 py-3 text-right font-mono text-zinc-200">
                {formatTry(itemTotal(item))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-zinc-900/60">
          <tr>
            <td colSpan={2} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-zinc-500">
              Toplam
            </td>
            <td className="px-4 py-3 text-right text-base font-bold text-white">
              {formatTry(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Havale/EFT bloğu — IBAN bilgileri + transfer açıklamasına yazılacak
 * benzersiz kod (`XIP-[TOKEN_KREDI]`) büyük ve kopyalanabilir.
 *
 * `referenceCode` yoksa (token'sız ürün akışı) `descriptionHint` gösterilir.
 */
export function BankTransferBlock({
  referenceCode,
  descriptionHint,
}: {
  referenceCode?: string;
  descriptionHint?: string;
}) {
  const { copied, copy } = useCopy();

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-400">
        Havale / EFT ile Ödeme
      </p>

      {hasBankDetails ? (
        <div className="space-y-2.5 text-left">
          <InfoRow
            label="Banka"
            value={<span className="text-sm font-bold text-white">{PAYMENT_BANK.bankName}</span>}
          />

          <InfoRow
            label="IBAN"
            value={
              <span className="break-all font-mono text-sm font-bold text-white">
                {PAYMENT_BANK.iban}
              </span>
            }
            action={
              <CopyButton
                value={PAYMENT_BANK.iban.replace(/\s/g, "")}
                copyKey="iban"
                copied={copied}
                onCopy={copy}
                label="IBAN kopyala"
              />
            }
          />

          <InfoRow
            label="Hesap Sahibi"
            value={<span className="text-sm font-bold text-white">{PAYMENT_BANK.accountName}</span>}
          />
        </div>
      ) : (
        <p className="text-sm text-amber-200/80">
          IBAN bilgileri için lütfen bizimle iletişime geçin.
        </p>
      )}

      {/* Açıklama — token'sız akışta serbest metin ipucu, tokenlı akışta kod */}
      {referenceCode ? (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-black/30 p-4 text-center">
          <p className="mb-1 text-[11px] uppercase tracking-widest text-amber-400">
            Açıklamaya yazılacak kod (zorunlu)
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-xl font-black tracking-widest text-amber-300 sm:text-2xl">
              {referenceCode}
            </span>
            <CopyButton
              value={referenceCode}
              copyKey="ref"
              copied={copied}
              onCopy={copy}
              label="Kodu kopyala"
            />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-amber-600/90">
            Lütfen havaleyi yaparken açıklama alanına yalnızca yukarıdaki kodu yazın. Ödemeniz bu kod
            ile eşleştirilir; kodsuz transferlerin onayı gecikebilir.
          </p>
        </div>
      ) : (
        descriptionHint && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-black/30 p-4 text-center">
            <p className="mb-1 text-[11px] uppercase tracking-widest text-amber-400">
              Açıklama (zorunlu)
            </p>
            <p className="text-sm font-semibold text-amber-200">{descriptionHint}</p>
          </div>
        )
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] text-zinc-500">{label}</p>
        <div className="min-w-0">{value}</div>
      </div>
      {action}
    </div>
  );
}
