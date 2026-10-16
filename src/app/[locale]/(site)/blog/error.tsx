"use client";

import RouteError from "@/components/Error/RouteError/RouteError";

export default function BlogError({
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
      title="Blog yazıları şu anda yüklenemiyor"
      description="İçerik servisi geçici bir sorun yaşıyor. Lütfen tekrar deneyin veya ana sayfaya dönün."
    />
  );
}