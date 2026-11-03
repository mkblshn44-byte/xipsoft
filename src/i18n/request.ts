import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    // ENVIRONMENT_FALLBACK hatasını ve farklı sunucu/timezone ortamlarında
    // oluşabilecek markup/hydration mismatch ("dağınık / stylesız görünüm")
    // riskini kapatır. next-intl v4 varsayılan timeZone ister.
    timeZone: "Europe/Istanbul",
  };
});
