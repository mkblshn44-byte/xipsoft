"use client";

import { useSyncExternalStore } from "react";
import { trackTeklifOpen } from "@/utils/analytics";

export type TeklifModalState = { open: boolean; service?: string };

const initialState: TeklifModalState = { open: false };
const listeners = new Set<() => void>();
let globalState = initialState;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

export const teklifModal = {
  open: (service?: string) => {
    globalState = { open: true, service };
    notify();
    trackTeklifOpen(service);
  },
  close: () => {
    globalState = { open: false };
    notify();
  },
};

export function useTeklifModalState() {
  return useSyncExternalStore(
    subscribe,
    () => globalState,
    () => initialState
  );
}
