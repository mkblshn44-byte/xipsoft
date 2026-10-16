"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import TitleText from "@/components/Common/TitleText/TitleText";

export default function CartSidebar() {
  const { isOpen, setIsOpen, items, removeFromCart, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const router = useRouter();

  const handleCheckout = () => {
    setIsOpen(false);
    // Sepetteki ilk ürünü ödeme sayfasına tası
      if (items.length === 1) {
        const item = items[0]!;
      router.push(
        `/odeme?product=${encodeURIComponent(item.name)}&price=${item.price * item.quantity}&id=${item.productId}`
      );
    } else if (items.length > 1) {
      // Birden fazla ürün varsa sadece toplam fiyatla git
      router.push(`/odeme?price=${totalPrice}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-950 border-l border-purple-500/20 shadow-[0_0_50px_rgba(167,139,250,0.2)] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-purple-400" />
                <TitleText tag="h2" variant="section" className="text-xl">
                  Sepetim ({totalItems})
                </TitleText>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-purple-500/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">Sepetiniz bos</p>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-black/40 border border-purple-500/10 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="-semibold text-white">{item.name}</h3>
                        <p className="text-sm text-zinc-500">Demo: {item.selectedDemo}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-1.5 hover:bg-purple-500/10 rounded-lg transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4 text-zinc-400" />
                        </button>
                        <span className="w-8 text-center text-white font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1.5 hover:bg-purple-500/10 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4 text-zinc-400" />
                        </button>
                      </div>
                      <p className="-bold text-purple-400">
                        {(item.price * item.quantity).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-purple-500/20 p-6 space-y-4 bg-black/40">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Toplam</span>
                  <span className="-display text-2xl font-bold text-purple-400 drop-shadow-[0_0_12px_rgba(167,139,250,0.4)]">
                    {totalPrice.toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    })}
                  </span>
                </div>
                
                <button
                  onClick={handleCheckout}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white rounded-xl font-bold text-lg transition-all hover:shadow-[0_0_30px_rgba(167,139,250,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Ödemeye geç
                </button>
                
                <button
                  onClick={clearCart}
                  className="w-full py-3 text-zinc-400 hover:text-red-400 transition-colors text-sm font-medium"
                >
                  Sepeti Temizle
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
