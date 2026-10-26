import { BRAND_ICONS, BRAND_COLORS } from "@/config/brand.config";

const Favicons = () => {
  return (
    <>
      {/* Canonical /favicon.ico — tarayıcıların varsayılan isteği */}
      <link rel="shortcut icon" href="/favicon.ico" />
      {/* Çelik rozet seti — .ico'dan ÖNCE bildirilir, modern tarayıcılar PNG'yi seçer */}
      <link rel="icon" type="image/png" sizes="32x32" href="/media/favicon-32.png" />
      <link rel="icon" type="image/png" sizes="192x192" href={BRAND_ICONS.icon192} />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href={BRAND_ICONS.appleTouchIcon} />
      <meta name="msapplication-TileImage" content={BRAND_ICONS.favicon} />
      <meta name="msapplication-TileColor" content={BRAND_COLORS.background} />
      <meta name="theme-color" content={BRAND_COLORS.themeColor} />
    </>
  );
};

export default Favicons;
