"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import XipIcon from "@/components/Ui/Icon";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/utils";

const AdSenseConsent = () => {
  const t = useTranslations("consent");
  const [showConsent, setShowConsent] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consentgiven = localStorage.getItem("xipsoft_adsense_consent");
    if (consentgiven) return;

    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const show = () => setShowConsent(true);

    // LCP'den sonra göster
    if (document.readyState === "complete") {
      const ric = (window as any).requestIdleCallback;
      if (typeof ric === "function") idleId = ric(show, { timeout: 10000 });
      else timeoutId = setTimeout(show, 7000);
    } else {
      window.addEventListener("load", () => {
        const ric = (window as any).requestIdleCallback;
        if (typeof ric === "function") idleId = ric(show, { timeout: 10000 });
        else timeoutId = setTimeout(show, 7000);
      }, { once: true });
    }

    return () => {
      if (idleId !== null && typeof (window as any).cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleAccept = () => {
    localStorage.setItem("xipsoft_adsense_consent", "accepted");
    setShowConsent(false);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "consent_given",
      consent_type: "adsense",
    });
    window.dispatchEvent(new CustomEvent("xipsoft-adsense-consent", {
      detail: { status: "accepted" },
    }));
  };

  const handleDecline = () => {
    localStorage.setItem("xipsoft_adsense_consent", "declined");
    setShowConsent(false);
    window.dispatchEvent(new CustomEvent("xipsoft-adsense-consent", {
      detail: { status: "declined" },
    }));
  };

  return (
    <AnimatePresence>
      {showConsent && (
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn("fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6")}
      >
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-zinc-700/50 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Animated gradient border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
              <motion.div
                className="h-full w-[200%] will-change-transform"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, #ddd6fe 15%, #a78bfa 35%, #a78bfa 50%, #a78bfa 65%, #ddd6fe 85%, transparent 100%)",
                }}
                animate={{ translateX: ["-50%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Close button */}
            <button
              onClick={handleDecline}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors duration-200"
              aria-label="Close consent banner"
            >
              <XipIcon name="x" glow="soft" className="w-4 h-4 text-zinc-400" />
            </button>

            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-prism-cyan/20 to-prism-violet/20 border border-zinc-700/50 flex items-center justify-center">
                    <XipIcon name="shield-check" glow="strong" className="w-6 h-6 text-prism-cyan" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">
                    {t("title")}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {t("description")}
                  </p>
                </div>
              </div>

              {/* Details toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-prism-cyan hover:text-prism-violet transition-colors duration-200 mb-4"
              >
                <XipIcon name="settings" glow="soft" className="w-4 h-4" />
                <span>{showDetails ? t("hideDetails") : t("showDetails")}</span>
              </button>

              {/* Details content */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden mb-6"
                  >
                    <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-3">
                      <div className="flex items-start gap-3">
                        <XipIcon name="cookie" glow="soft" className="w-5 h-5 text-prism-violet flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                            {t("details.cookies.title")}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            {t("details.cookies.content")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <XipIcon name="shield-check" glow="soft" className="w-5 h-5 text-prism-cyan flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                            {t("details.data.title")}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            {t("details.data.content")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <XipIcon name="settings" glow="soft" className="w-5 h-5 text-prism-rose flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                            {t("details.control.title")}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            {t("details.control.content")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Links */}
              <div className="flex flex-wrap gap-3 mb-6 text-xs text-zinc-400">
                <Link
                  href="/privacy-policy"
                  className="hover:text-prism-cyan transition-colors duration-200 underline underline-offset-2"
                >
                  {t("links.privacy")}
                </Link>
                <span>•</span>
                <Link
                  href="/cookie-policy"
                  className="hover:text-prism-cyan transition-colors duration-200 underline underline-offset-2"
                >
                  {t("links.cookies")}
                </Link>
                <span>•</span>
                <Link
                  href="/terms-of-service"
                  className="hover:text-prism-cyan transition-colors duration-200 underline underline-offset-2"
                >
                  {t("links.terms")}
                </Link>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAccept}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-prism-cyan to-prism-violet text-white font-semibold text-sm hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-prism-cyan/20"
                >
                  {t("accept")}
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 px-6 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-300 font-semibold text-sm hover:bg-zinc-800 transition-colors duration-200"
                >
                  {t("decline")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdSenseConsent;
