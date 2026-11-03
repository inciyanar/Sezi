"use client";

import { AskResponseSchema, askConversationReply, type AskHistoryMessage, type AskResponse } from "@sezi/shared";

import type { Lang } from "./i18n";
import { browserSupabase } from "./supabase-browser";

const DEVICE_KEY = "sezi.web.device";
/** Sunucu cevap üretemezse kullanıcı uzun beklemesin. */
const ASK_TIMEOUT_MS = 30_000;

/**
 * Kişisel bilgi taşımayan tarayıcı kimliği: sunucu bunu saklamaz, yalnız soru sınırı için tek yönlü özetler.
 * Tarayıcı verisi silinince kimlik de gider.
 */
function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/**
 * Sezi'ye Sor: soru, kısa konuşma geçmişi ve (eser sayfasındaysa) o eser Edge Function'a gider; cevabı
 * doğrulanmış kaynak metinleriyle sunucu üretir. Kaynaksız cevap gelmez (`mode: "insufficient"`).
 */
export async function askSezi(question: string, lang: Lang, candidateSlugs: string[], history: AskHistoryMessage[]): Promise<AskResponse> {
  const conversation = askConversationReply(question, lang);
  if (conversation) return { mode: "conversation", answer: conversation, citations: [], workSlugs: [] };
  const { data, error } = await browserSupabase().functions.invoke("ask", {
    body: {
      question,
      lang,
      deviceId: deviceId(),
      candidateSlugs,
      history: history.slice(-6).map((m) => ({ ...m, text: m.text.slice(0, 600) })),
    },
    timeout: ASK_TIMEOUT_MS,
  });
  if (error) throw error;
  return AskResponseSchema.parse(data);
}
