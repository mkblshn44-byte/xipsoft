import { teklifModal } from "@/components/Common/TeklifModal/TeklifModal";

export const defaultParallaxHeroCta = {
  ctaPrimary: {
    label: "Teklif Al",
    onClick: () => teklifModal.open(),
  },
  ctaSecondary: {
    label: "Hizmetleri İncele",
    href: "/hizmetler/web-yazilim-tasarim",
  },
};
