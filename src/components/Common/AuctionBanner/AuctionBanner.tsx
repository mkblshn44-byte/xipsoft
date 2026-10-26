"use client";

import React from "react";
import { useAuction } from "@/context/AuctionContext";
import XipIcon from "@/components/Ui/Icon";

export function AuctionBanner() {
  const { liveBids, stats } = useAuction();
  const latestBid = liveBids[0];

  return (
    <div className="border-b border-edge-neon bg-gradient-to-r from-neon/10 via-transparent to-neon/10 text-ink text-xs sm:text-sm py-2 px-4">
      <div className="max-w-7xl mx-auto flex min-h-[72px] flex-col md:min-h-8 md:flex-row items-center justify-between gap-2">
        <div className="flex min-h-8 items-center gap-2 font-medium">
          <span className="inline-flex items-center gap-1 bg-neon/15 text-neon-300 px-2 py-0.5 rounded-full border border-neon/25 text-xs font-semibold animate-pulse">
            <XipIcon name="flame" className="w-3.5 h-3.5" glow="none" /> Canlı Açık Artırma & Teklif Altyapısı
          </span>
          <span className="hidden sm:inline text-ink-muted">
            Dinamik Fiyatlandırma Motoru Aktif ({stats.activeAuctions} Aktif İhale)
          </span>
        </div>

        <div className="flex min-h-8 w-full min-w-0 items-center justify-center text-ink-secondary md:w-auto md:justify-end">
          {latestBid ? (
            <div className="flex min-w-0 max-w-full items-center gap-3">
              <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-md border border-space-700 bg-space-800/80 px-2.5 py-1 whitespace-nowrap">
                <XipIcon name="tag" className="h-3.5 w-3.5 shrink-0 text-neon-400" glow="none" />
                <span className="shrink-0">Son Teklif:</span>
                <strong className="max-w-[7rem] truncate font-semibold text-accent-cyan sm:max-w-[12rem]">{latestBid.service}</strong>
                <span className="max-w-[5rem] truncate text-ink-dim sm:max-w-none">({latestBid.bidderName})</span>
                <span className="inline-flex shrink-0 items-center text-xs font-bold text-neon-300">
                  <XipIcon name="trending-down" className="mr-0.5 h-3 w-3 shrink-0" glow="none" />
                  %{latestBid.discountPercentage} İndirimli
                </span>
              </div>
              <div className="hidden shrink-0 items-center gap-1 text-ink-dim lg:flex">
                <XipIcon name="clock" className="h-3.5 w-3.5 text-neon-300" glow="none" />
                <span>Ort. İndirim: %{stats.averageSavingsPercent}</span>
              </div>
            </div>
          ) : (
            <div className="invisible min-h-8" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
