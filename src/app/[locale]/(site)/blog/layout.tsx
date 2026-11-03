"use client";

import Container from "@/components/Common/Container/Container";
import styles from "@/styles/styles";
import { useEffect } from "react";

// Metadata Blog/page.tsx'de generateMetadata() ile dinamik üretiliyor
// Layout'ta statik metadata tanımlamak page metadata'sını override eder — kaldırıldı

function BlogDarkModeEnforcer() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("dark");
    html.classList.remove("light");
    return () => {
      html.classList.remove("dark");
    };
  }, []);
  return null;
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container className={styles.paddingHelper}>
      <BlogDarkModeEnforcer />
      {children}
    </Container>
  );
}
