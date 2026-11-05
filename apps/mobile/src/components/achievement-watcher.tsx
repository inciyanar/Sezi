import { achievementLevels, newlyEarned } from '@sezi/shared';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { z } from 'zod';
import { achievementTitle } from '@/components/social-visuals';
import { useAccount } from '@/lib/account';
import { useAchievements } from '@/lib/achievements';
import { useT } from '@/lib/i18n';

export function AchievementWatcher() {
  const { user } = useAccount();
  const { list, ready } = useAchievements();
  const { t, lang } = useT();
  const key = `sezi.ach.seen.${user?.id ?? 'anon'}.v1`;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const load = async () => {
      let seen: Record<string, number> | null = null;
      try {
        const raw = await Storage.getItem(key);
        if (raw) {
          const parsed = z.record(z.string(), z.number().finite()).safeParse(JSON.parse(raw));
          if (parsed.success) seen = parsed.data;
        }
      } catch {
        // Bozuk kayıt mevcut düzeylerle yeniden kurulur.
      }
      if (cancelled) return;
      if (!seen) {
        Storage.setItemSync(key, JSON.stringify(achievementLevels(list)));
        return;
      }
      // Hoş Geldin damgası kurulumun "Hazır" adımında kutlanır; kutlama ekranı yeniden açılmaz, yalnız görüldü sayılır.
      const first = newlyEarned(seen, list).find((item) => item.kind !== 'welcome');
      if (!first) {
        if (newlyEarned(seen, list).length) Storage.setItemSync(key, JSON.stringify(achievementLevels(list)));
        return;
      }
      Storage.setItemSync(key, JSON.stringify(achievementLevels(list)));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AccessibilityInfo.announceForAccessibility(`${achievementTitle(first, t, lang)}. ${t('ach.level', { level: first.level, max: first.maxLevel })}`);
      router.push({ pathname: '/stamp/[id]', params: { id: first.id } });
    };
    void load();
    return () => { cancelled = true; };
  }, [key, list, ready, t, lang]);
  return null;
}
