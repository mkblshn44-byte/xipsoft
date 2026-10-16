"use client";

import RouteError from "@/components/Error/RouteError/RouteError";

export default function RootError({
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
      title="Bir sorun oluştu"
      description="Sayfa yüklenirken beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyin ya da ana sayfaya dönün."
    />
  );
}
