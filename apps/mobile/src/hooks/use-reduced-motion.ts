import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useSettings } from '@/lib/settings';

/** Sistem tercihi ya da uygulamadaki "Hareketleri azalt" ayarı. Sistem okunana kadar hareketsiz başla. */
export function useReducedMotion() {
  const { settings } = useSettings();
  const [system, setSystem] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setSystem(value); });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => { active = false; listener.remove(); };
  }, []);
  return system || settings.reduceMotion;
}
