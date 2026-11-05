import { createClient, processLock } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Boş bırakılan publishable satırı (.env.example kopyası) anon anahtarına düşer: `??` değil `||`.
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_KEY apps/mobile/.env içinde tanımlı olmalı');
}
const apiKey: string = key;
/** Oturumun cihazdaki anahtarı: supabase-js varsayılanıyla aynı (mevcut oturumlar korunur); çıkış doğrulaması okur. */
export const SESSION_KEY = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;

/**
 * Okuma isteklerine süre sınırı. Zayıf bağlantıda takılan bağlantı hiç sonuçlanmıyor, Keşfet sonsuza dek iskelette
 * kalıyordu (emülatörde GSM hızında başlayan istek, ağ düzelince de dönmedi). Süre dolunca istek hata verir; sorgu
 * bir kez yeniden dener, sonra "Tekrar dene" görünür. Yazmalar (yükleme dahil) sınırlanmaz.
 */
const READ_TIMEOUT_MS = 30_000;
function timedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return fetch(input, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
  const outer = init?.signal;
  if (outer?.aborted) controller.abort();
  else outer?.addEventListener('abort', () => controller.abort(), { once: true });
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Keşif hesapsız (anon) çalışır. Hesap isteğe bağlıdır: oturum cihazda (kv-store) saklanır, uygulama
 * öndeyken anahtar yenilenir. E-posta akışları kodla yürüdüğü için URL'den oturum okunmaz.
 */
export const supabase = createClient(url, key, {
  auth: { storage: Storage, storageKey: SESSION_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock },
  global: { fetch: timedFetch },
});

// Arka planda yenileme durur (React Native'de zamanlayıcı güvenilmez); öne gelince sürer.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});

/** Admin panelinden yüklenen ses kayıtlarının (nokta, eser) genel adresi. */
export const AUDIO_BASE = `${url}/storage/v1/object/public/audio/`;

/** Özel kovadaki dosya (ör. profil fotoğrafı): oturum anahtarıyla okunur; adres dosya başına sabit, önbellek ona bağlı. */
export function privateObject(bucket: string, path: string, accessToken: string) {
  return { uri: `${url}/storage/v1/object/authenticated/${bucket}/${path}`, headers: { Authorization: `Bearer ${accessToken}`, apikey: apiKey } };
}
