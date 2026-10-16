"use client";

import RouteError from "@/components/Error/RouteError/RouteError";

export default function XRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Profil sayfası şu anda yüklenemiyor"
      description="Beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin veya ana sayfaya dönün."
    />
  );
}