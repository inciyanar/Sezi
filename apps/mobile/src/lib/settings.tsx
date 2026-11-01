import { SyncedSettings } from '@sezi/shared';
import Storage from 'expo-sqlite/kv-store';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { useProfile } from '@/lib/profile';

/** v2: birincil tema açık tema oldu; eski kayıttan yalnızca konuşma hızı ve il taşınır. */
const KEY = 'sezi.settings.v2';
const LEGACY_KEY = 'sezi.settings.v1';

const SettingsSchema = SyncedSettings.extend({
  /** Keşfet ekranında seçili envanter ili. */
  city: z.string().default('bursa'),
  /** Geliştirici seçenekleri: sanal yürüyüş, jüri senaryoları ve cihaz testleri. */
  devSimulation: z.boolean().default(false),
});
export type Settings = z.infer<typeof SettingsSchema>;

/** Az gören profili seçilince açılan görünüm; kullanıcı her birini sonra ayrı ayrı değiştirebilir. */
export const LOW_VISION_DEFAULTS = { highContrast: true, textScale: 'large' } as const satisfies Partial<Settings>;
/** Az gören profilinden çıkınca görünüm varsayılana döner (renk körlüğü ve hareket ayrı tercih, korunur). */
export const DEFAULT_VISION_LOOK = { highContrast: false, textScale: 'normal' } as const satisfies Partial<Settings>;

/** Uygulama içi yazı büyütme çarpanı. */
export const TEXT_SCALE: Record<Settings['textScale'], number> = { normal: 1, large: 1.15, xlarge: 1.3 };
function loadJson<T>(key: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, fallback: T): T {
  try {
    const raw = Storage.getItemSync(key);
    if (!raw) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const [settings, setSettings] = useState<Settings>(() => {
    const raw = Storage.getItemSync(KEY);
    if (raw) {
      const loaded = loadJson(KEY, SettingsSchema, SettingsSchema.parse({}));
      // Görme ayarlarından önceki kayıt: az gören profili eskiden yüksek kontrastı zorunlu açıyordu, aynı görünüm korunur.
      if (!raw.includes('"highContrast"') && profile?.vision === 'low') return { ...loaded, ...LOW_VISION_DEFAULTS };
      return loaded;
    }
    const legacy = loadJson(LEGACY_KEY, SettingsSchema, SettingsSchema.parse({}));
    return SettingsSchema.parse({ speechRate: legacy.speechRate, city: legacy.city, ...(profile?.vision === 'low' ? LOW_VISION_DEFAULTS : {}) });
  });

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = SettingsSchema.parse({ ...prev, ...patch });
      Storage.setItemSync(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings, SettingsProvider içinde kullanılmalı');
  return ctx;
}
