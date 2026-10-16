import { permanentRedirect } from "next/navigation";

export default async function UrunlerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(locale === "tr" ? "/hizmetler" : `/${locale}/hizmetler`);
}