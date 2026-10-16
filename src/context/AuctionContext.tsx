"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { auctionEngine, AuctionBid, ActiveAuctionSession, AuctionStats } from "@/lib/auction-engine";

interface AuctionContextType {
  liveBids: AuctionBid[];
  activeAuctions: ActiveAuctionSession[];
  stats: AuctionStats;
  submitBid: (bid: { service: string; bidderName: string; proposedPrice?: number; token?: string }) => AuctionBid;
  getDynamicPrice: (service: string) => { estimatedPrice: number; originalPrice: number; discountPercent: number };
}

const AuctionContext = createContext<AuctionContextType | null>(null);

export function AuctionProvider({ children }: { children: React.ReactNode }) {
  const [liveBids, setLiveBids] = useState<AuctionBid[]>(() => auctionEngine.getLiveBids(10));
  const [activeAuctions, setActiveAuctions] = useState<ActiveAuctionSession[]>(() => auctionEngine.getActiveAuctions());
  const [stats, setStats] = useState<AuctionStats>(() => auctionEngine.getStats());

  const refreshState = () => {
    setLiveBids(auctionEngine.getLiveBids(10));
    setActiveAuctions(auctionEngine.getActiveAuctions());
    setStats(auctionEngine.getStats());
  };

  useEffect(() => {
    // Simulate real-time stream updates every 15 seconds
    const interval = setInterval(() => {
      refreshState();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const submitBid = (bidData: { service: string; bidderName: string; proposedPrice?: number; token?: string }) => {
    const newBid = auctionEngine.registerBid(bidData);
    refreshState();
    return newBid;
  };

  const getDynamicPrice = (service: string) => {
    return auctionEngine.calculateDynamicPrice(service);
  };

  return (
    <AuctionContext.Provider
      value={{
        liveBids,
        activeAuctions,
        stats,
        submitBid,
        getDynamicPrice,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuction() {
  const context = useContext(AuctionContext);
  if (!context) {
    // Fallback if rendered outside Provider
    return {
      liveBids: auctionEngine.getLiveBids(10),
      activeAuctions: auctionEngine.getActiveAuctions(),
      stats: auctionEngine.getStats(),
      submitBid: (bid: { service: string; bidderName: string; proposedPrice?: number; token?: string }) =>
        auctionEngine.registerBid(bid),
      getDynamicPrice: (service: string) => auctionEngine.calculateDynamicPrice(service),
    };
  }
  return context;
}
