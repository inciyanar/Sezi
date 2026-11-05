import { router } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, GlassScope, GlassTarget } from '@/components/glass';
import { CompassIcon, PassportIcon, PeopleIcon, PlusIcon, RouteIcon } from '@/design/icons';
import { outline, SoftPressable } from '@/design/sweet/components';
import { radius, space, type } from '@/design/type';
import { useIsDark, useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';

type TabIcon = (props: { color: string; filled: boolean }) => ReactNode;

/** Çubuğun kendi yüksekliği: 56 dp sekme + 2 × 6 dp iç pay. */
const BAR_HEIGHT = 68;
/** Çubuğun yan kenarlardan ve ekran altından (güvenli alanın üstünde) uzaklığı. */
const BAR_GAP = 14;
const BAR_BOTTOM = 22;

/** Klavye açık mı (açıkken sekme çubuğu gizlenir). */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

/**
 * Sekme ekranlarının alt boşluğu: çubuk içeriğin üstünde yüzdüğü için kaydırılan içerik çubuğun arkasında
 * kalmamalı (çubuk yüksekliği + güvenli alan + 16). Klavye açıkken çubuk gizli olduğundan boşluk küçülür.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOpen();
  return keyboard ? space.md : BAR_HEIGHT + BAR_BOTTOM + insets.bottom + space.lg;
}

/**
 * Yüzen sekme çubuğu: buzlu koyu cam hap (maketteki `.tabbar`). Sekme ekranları çubuğun bulanıklık hedefi içinde
 * çizilir; çubuk altından geçen içeriği bulanık gösterir. Beş yuva: Keşfet · Sezilenler · (+) · Rota · Pasaport.
 * Keşfet, Sezilenler ve Pasaport sekmedir; ortadaki altın "+" fotoğraf paylaşma ekranını, Rota navigasyon
 * ekranını açar (yığın ekranı, sekme değil). Seçili sekmede simge altın ve göstergede, yazı kalın
 * (renkten bağımsız da ayrılır). Klavye açıkken çubuk gizlenir.
 */
export default function AppTabs() {
  const t = useSweetTheme();
  const { t: tr } = useT();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOpen();
  const tone = useIsDark() && !t.outlined ? 'dark' : 'light';
  const ink = t.glass[tone];
  const idle = ink.muted;

  return (
    // Tetikleyiciler TabList'in (asChild ile tek katman altındaki View'in) doğrudan çocuğu olmalı; diğer çocuklar
    // (paylaş ve rota düğmeleri) yönlendiriciye sayılmaz, olduğu gibi çizilir.
    <GlassScope>
      <Tabs style={{ flex: 1 }}>
        <GlassTarget style={{ flex: 1 }}>
          <TabSlot />
        </GlassTarget>
        <TabList asChild>
          <View
            accessibilityRole="tablist"
            // expo-router Slot dizi stil kabul etmiyor.
            style={StyleSheet.flatten([s.barWrap, { bottom: insets.bottom + BAR_BOTTOM }, keyboard && { display: 'none' }])}>
            <Glass tone={tone} radius={radius.pill} style={StyleSheet.absoluteFill} />
            {!t.outlined && <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.rim, { borderColor: `${ink.text}24` }]} />}
            <TabTrigger name="index" href="/" asChild>
              <TabButton idle={idle} label={tr('tabs.explore')} icon={({ color, filled }) => <CompassIcon color={color} filled={filled} size={22} />} />
            </TabTrigger>
            <TabTrigger name="feed" href="/feed" asChild>
              <TabButton idle={idle} label={tr('tabs.feed')} icon={({ color, filled }) => <PeopleIcon color={color} filled={filled} size={22} />} />
            </TabTrigger>
            <View style={s.tab}>
              <SoftPressable
                onPress={() => router.push('/photos/new')}
                accessibilityRole="button"
                accessibilityLabel={tr('tabs.share')}
                style={[s.plus, { backgroundColor: t.gold.fill }, outline(t)]}>
                <PlusIcon color={t.gold.ink} size={24} />
              </SoftPressable>
            </View>
            <Pressable
              onPress={() => router.push('/navigate')}
              accessibilityRole="button"
              accessibilityLabel={tr('tabs.route')}
              style={s.tab}>
              <RouteIcon color={idle} size={22} />
              <Text style={[s.label, { color: idle }]} numberOfLines={1}>
                {tr('tabs.route')}
              </Text>
            </Pressable>
            <TabTrigger name="passport" href="/passport" asChild>
              <TabButton idle={idle} label={tr('tabs.passport')} icon={({ color, filled }) => <PassportIcon color={color} filled={filled} size={22} />} />
            </TabTrigger>
          </View>
        </TabList>
      </Tabs>
    </GlassScope>
  );
}

/**
 * Maketteki sekme: simge üstte, 11 px kalın etiket altta. Seçili sekmede simge altın ve dolu (renkten bağımsız
 * biçim farkı), etiket krem; diğerleri soluk krem.
 */
function TabButton({ isFocused = false, label, icon, idle, ...props }: TabTriggerSlotProps & { label: string; icon: TabIcon; idle: string }) {
  const t = useSweetTheme();
  const tone = useIsDark() && !t.outlined ? 'dark' : 'light';
  const iconColor = isFocused ? t.primaryText : idle;
  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: isFocused }} style={s.tab}>
      {icon({ color: iconColor, filled: isFocused })}
      <Text style={[s.label, { color: isFocused ? t.glass[tone].text : idle }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  barWrap: {
    flexDirection: 'row',
    position: 'absolute',
    left: BAR_GAP,
    right: BAR_GAP,
    height: BAR_HEIGHT,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  rim: { borderRadius: radius.pill, borderCurve: 'continuous', borderWidth: 1 },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontFamily: type.tab.fontFamily, fontSize: 11, lineHeight: 14 },
  plus: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
