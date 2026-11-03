"use client";

import { useSyncExternalStore } from "react";

import { CAT_KEY_NAME as CAT_KEY, CONTRAST_KEY_NAME as CONTRAST_KEY, TEXT_KEY_NAME as TEXT_KEY } from "./appearance-keys";

/**
 * Görünüm: yüksek kontrast, yazı boyutu ve Sezi kedisi. Tercih bu tarayıcıda saklanır; kontrast ve yazı boyutu
 * `<html>` öğesine `data-contrast` / `data-text` olarak yazılır, ilk boyamadan önce `APPEARANCE_SCRIPT` uygular
 * (yanıp sönme olmaz). Kedi yalnız istemcide çizilir; sunucu görüntüsünde yoktur.
 */
export const TEXT_SIZES = ["normal", "lg", "xl"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export interface Appearance {
  contrast: boolean;
  text: TextSize;
  cat: boolean;
}

const isTextSize = (v: string | null): v is TextSize => v === "normal" || v === "lg" || v === "xl";

let current: Appearance | null = null;
const listeners = new Set<() => void>();

function read(): Appearance {
  if (current) return current;
  const text = localStorage.getItem(TEXT_KEY);
  current = {
    contrast: localStorage.getItem(CONTRAST_KEY) === "high",
    text: isTextSize(text) ? text : "normal",
    cat: localStorage.getItem(CAT_KEY) !== "off",
  };
  return current;
}

const SERVER: Appearance = { contrast: false, text: "normal", cat: false };

export function setAppearance(patch: Partial<Appearance>) {
  const next = { ...read(), ...patch };
  current = next;
  const root = document.documentElement;
  if (next.contrast) {
    localStorage.setItem(CONTRAST_KEY, "high");
    root.dataset.contrast = "high";
  } else {
    localStorage.removeItem(CONTRAST_KEY);
    delete root.dataset.contrast;
  }
  localStorage.setItem(TEXT_KEY, next.text);
  if (next.text === "normal") delete root.dataset.text;
  else root.dataset.text = next.text;
  if (next.cat) localStorage.removeItem(CAT_KEY);
  else localStorage.setItem(CAT_KEY, "off");
  listeners.forEach((l) => l());
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => SERVER,
  );
}
