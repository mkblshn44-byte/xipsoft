/**
 * Centralized Site-wide Auction & Dynamic Pricing Engine (Auction Altyapısı)
 *
 * Site genelindeki tekliflendirme, anlık fiyat güncellemeleri, canlı ihale
 * ve dinamik fiyatlandırma süreçlerini tek merkezden yönetir.
 */

export interface AuctionBid {
  id: string;
  service: string;
  bidderName: string;
  offeredPrice: number;
  originalPrice: number;
  discountPercentage: number;
  timestamp: string;
  status: 'pending' | 'accepted' | 'active';
  token?: string;
}

export interface ActiveAuctionSession {
  id: string;
  title: string;
  serviceCategory: string;
  startingPrice: number;
  currentLowestPrice: number;
  highestDiscount: number;
  endsAt: string;
  totalBidsCount: number;
  status: 'active' | 'completed';
}

export interface AuctionStats {
  activeAuctions: number;
  totalBidsToday: number;
  averageSavingsPercent: number;
  liveDemandLevel: 'Yüksek' | 'Orta' | 'Yogun';
  updatedAt: string;
}

// In-Memory Storage for Auction State & Bids
class CentralizedAuctionEngine {
  private bids: AuctionBid[] = [
    {
      id: 'bid-101',
      service: 'Web Yazılım & Tasarım',
      bidderName: 'Ahmet Y. ***',
      offeredPrice: 24500,
      originalPrice: 35000,
      discountPercentage: 30,
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      status: 'active',
    },
    {
      id: 'bid-102',
      service: 'Mobil Uygulama',
      bidderName: 'Selin K. ***',
      offeredPrice: 42000,
      originalPrice: 55000,
      discountPercentage: 23,
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      status: 'active',
    },
    {
      id: 'bid-103',
      service: 'Yapay Zeka & Otomasyon',
      bidderName: 'Mehmet B. ***',
      offeredPrice: 18900,
      originalPrice: 27000,
      discountPercentage: 30,
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      status: 'accepted',
    },
  ];

  private activeAuctions: ActiveAuctionSession[] = [
    {
      id: 'auc-web-01',
      title: 'Next.js & React Kurumsal Web Yazılım Mimarisi',
      serviceCategory: 'Web Yazılım & Tasarım',
      startingPrice: 40000,
      currentLowestPrice: 26500,
      highestDiscount: 33,
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
      totalBidsCount: 14,
      status: 'active',
    },
    {
      id: 'auc-app-02',
      title: 'iOS & Android Cross-Platform Mobil Paket',
      serviceCategory: 'Mobil Uygulama',
      startingPrice: 60000,
      currentLowestPrice: 41000,
      highestDiscount: 31,
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
      totalBidsCount: 9,
      status: 'active',
    },
    {
      id: 'auc-ai-03',
      title: 'Özel LLM & Chatbot Entegre Kurumsal Otomasyon',
      serviceCategory: 'Yapay Zeka & Otomasyon',
      startingPrice: 45000,
      currentLowestPrice: 29900,
      highestDiscount: 33,
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
      totalBidsCount: 18,
      status: 'active',
    },
  ];

  /**
   * Yeni teklifi / açık artırma teklifini sisteme kaydeder.
   */
  public registerBid(bidData: {
    service: string;
    bidderName: string;
    proposedPrice?: number;
    token?: string;
  }): AuctionBid {
    const basePrices: Record<string, number> = {
      'Web Yazılım & Tasarım': 35000,
      'Mobil Uygulama': 50000,
      'Masaüstü Yazılım': 40000,
      'Siber Güvenlik': 30000,
      'SEO & Dijital Pazarlama': 20000,
      'Yapay Zeka & Otomasyon': 45000,
    };

    const origPrice = basePrices[bidData.service] || 30000;
    const offerPrice =
      bidData.proposedPrice && bidData.proposedPrice > 0
        ? bidData.proposedPrice
        : Math.round(origPrice * (0.7 + Math.random() * 0.15));

    const discountPct = Math.round(((origPrice - offerPrice) / origPrice) * 100);

    const maskedName =
      bidData.bidderName.length > 2
        ? `${bidData.bidderName.slice(0, 2)}***`
        : 'Müşteri ***';

    const newBid: AuctionBid = {
      id: `bid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      service: bidData.service,
      bidderName: maskedName,
      offeredPrice: offerPrice,
      originalPrice: origPrice,
      discountPercentage: Math.max(5, Math.min(45, discountPct)),
      timestamp: new Date().toISOString(),
      status: 'pending',
      token: bidData.token,
    };

    this.bids.unshift(newBid);
    if (this.bids.length > 50) this.bids.pop();

    const matchingAuction = this.activeAuctions.find(
      (a) => a.serviceCategory === bidData.service
    );
    if (matchingAuction) {
      matchingAuction.totalBidsCount += 1;
      if (offerPrice < matchingAuction.currentLowestPrice) {
        matchingAuction.currentLowestPrice = offerPrice;
        matchingAuction.highestDiscount = discountPct;
      }
    }

    return newBid;
  }

  /**
   * Canlı teklif akışını döndürür.
   */
  public getLiveBids(limit = 10): AuctionBid[] {
    return this.bids.slice(0, limit);
  }

  /**
   * Aktif açık artırma oturumlarını döndürür.
   */
  public getActiveAuctions(): ActiveAuctionSession[] {
    return this.activeAuctions;
  }

  /**
   * Site geneli anlık ihale ve teklif istatistikleri
   */
  public getStats(): AuctionStats {
    const totalBidsToday = this.bids.length + 42;
    return {
      activeAuctions: this.activeAuctions.length,
      totalBidsToday,
      averageSavingsPercent: 28,
      liveDemandLevel: 'Yüksek',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Hizmet için dinamik fiyat tahmini hesaplar.
   */
  public calculateDynamicPrice(serviceName: string): {
    estimatedPrice: number;
    originalPrice: number;
    discountPercent: number;
  } {
    const priceMap: Record<string, number> = {
      'Web Yazılım & Tasarım': 35000,
      'Mobil Uygulama': 50000,
      'Masaüstü Yazılım': 40000,
      'Siber Güvenlik': 30000,
      'SEO & Dijital Pazarlama': 20000,
      'Yapay Zeka & Otomasyon': 45000,
    };

    const orig = priceMap[serviceName] || 30000;
    const discount = 25;
    const estimated = Math.round(orig * (1 - discount / 100));

    return {
      estimatedPrice: estimated,
      originalPrice: orig,
      discountPercent: discount,
    };
  }
}

export const auctionEngine = new CentralizedAuctionEngine();
