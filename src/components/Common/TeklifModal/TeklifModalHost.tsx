"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTeklifModalState } from "./teklif-modal-store";

const LazyTeklifModal = dynamic(() => import("./TeklifModal"), { ssr: false });

export default function TeklifModalHost() {
  const { open } = useTeklifModalState();
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);

  return hasOpened ? <LazyTeklifModal /> : null;
}
