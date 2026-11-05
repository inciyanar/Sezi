/**
 * Sezi arayüz bileşenleri ("Sezi kâğıt"). Tüm ekranlar bunlardan ve `design/sweet/components` parçalarından kurulur:
 * tek dokunma alanı ölçüsü (≥ 48 dp), tek köşe ölçeği (`radius`), tek tipografi ölçeği (`type`).
 * Yüzeyler düz: kart ve alanlar dolgu tonuyla ayrılır; yüksek kontrastta 2 dp çerçeve (`outline`).
 * Düğmeler, çipler ve bölmeli seçiciler haptır; ana eylem mürekkep hap, yanında altın ok dairesi olabilir.
 */
import { createContext, useContext, useRef, useState, type ReactNode, type RefObject } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Switch, TextInput, useWindowDimensions, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { Text } from '@/components/text';

import { useGlassInk } from '@/components/glass';
import { ArrowIcon, ChevronIcon, InfoIcon } from '@/design/icons';
import { EmptyMotif } from '@/design/motif';
import { outline, SoftPressable } from '@/design/sweet/components';
import { radius, space, type, upper } from '@/design/type';
import { useSweetTheme } from '@/hooks/use-sweet-theme';
import { useT } from '@/lib/i18n';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'cream' | 'line';

/**
 * Düğme: 56 dp (kompakt 48), hap. `primary` mürekkep dolgu, `secondary` yüzey dolgu, `outline` yüzey + ince çerçeve,
 * `ghost` yalnız yazı, `danger` tehlike rengi. Fotoğraf ya da koyu cam üstünde: `cream` krem dolgu + mürekkep yazı,
 * `line` saydam + 1.5 dp çerçeve (cam yazı rengiyle). `arrow` sağda altın daire içinde ok çizer.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  hint,
  style,
  compact,
  arrow,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: (color: string) => ReactNode;
  disabled?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  arrow?: boolean;
}) {
  const t = useSweetTheme();
  const ink = useGlassInk();
  const lineFg = ink?.text ?? t.text;
  const v = {
    primary: { bg: t.primary.fill, fg: t.primary.ink, border: t.primary.fill, width: 0 },
    secondary: { bg: t.surface, fg: t.text, border: t.surface, width: 0 },
    outline: { bg: t.surface, fg: t.text, border: t.border, width: 1.5 },
    ghost: { bg: 'transparent', fg: t.primaryText, border: 'transparent', width: 0 },
    danger: { bg: t.surface, fg: t.danger, border: t.danger, width: 1.5 },
    // Krem dolgu yüksek kontrastta beyazdır: yazı açık cam mürekkebi (siyah) olur.
    cream: { bg: t.onPhoto.text, fg: t.glass.light.text, border: t.onPhoto.text, width: 0 },
    line: { bg: 'transparent', fg: lineFg, border: lineFg, width: 1.5 },
  }[variant];
  return (
    <SoftPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.btn,
        compact && styles.btnCompact,
        arrow && styles.btnArrow,
        { backgroundColor: v.bg, borderColor: t.outlined && variant !== 'ghost' ? t.border : v.border, borderWidth: v.width },
        t.outlined && variant !== 'ghost' && { borderWidth: 2 },
        disabled && { opacity: 0.4 },
        style,
      ]}>
      {icon ? icon(v.fg) : null}
      <Text style={[type.button, { color: v.fg, flexShrink: 1, textAlign: 'center' }]}>{label}</Text>
      {arrow ? (
        // Dolgu zaten altınsa (koyu temada ana düğme) daire mürekkebe döner; yoksa altın daire dolguda kaybolur.
        <View style={[styles.arrow, { backgroundColor: v.bg === t.gold.fill ? t.gold.ink : t.gold.fill }]}>
          <ArrowIcon color={v.bg === t.gold.fill ? t.gold.fill : t.gold.ink} size={16} />
        </View>
      ) : null}
    </SoftPressable>
  );
}

/** Kart: yüzey rengi, 28 köşe, gölgesiz (zeminden tonla ayrılır). */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const t = useSweetTheme();
  // Çerçeve kalkınca 0 açıkça verilir: Android'de kenarlık silinince taşma kırpması bozulup içerik kayboluyor (tema canlı değişince).
  return <View style={[styles.card, { backgroundColor: t.surface }, outline(t), padded && { padding: space.lg }, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  const t = useSweetTheme();
  const ink = useGlassInk();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[type.heading, { color: ink?.text ?? t.text, flex: 1 }]} accessibilityRole="header">
        {title}
      </Text>
      {action}
    </View>
  );
}

/**
 * Sayısal ilerleme: renk dışında görünür oran ve ekran okuyucu değeri de taşır.
 * `compact`: görünür oranı çağıran kendisi yazar (kutucuklarda); çubuk ince olur.
 */
export function ProgressBar({ value, max, label, compact }: { value: number; max: number; label: string; compact?: boolean }) {
  const t = useSweetTheme();
  const limit = Math.max(0, max);
  const now = Math.min(limit, Math.max(0, value));
  const height = compact ? 6 : 8;
  return (
    <View
      style={{ gap: space.sm }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: limit, now }}>
      {compact ? null : (
        <Text style={[type.meta, { color: t.text }]}>
          {value} / {max}
        </Text>
      )}
      <View style={{ height, borderRadius: height / 2, backgroundColor: t.border, overflow: 'hidden' }}>
        <View
          style={{
            height,
            width: `${limit ? now / limit * 100 : 0}%`,
            backgroundColor: t.outlined ? t.text : t.primaryText,
          }}
        />
      </View>
    </View>
  );
}

/** Üst etiket: küçük, kalın, aralıklı büyük harf (Türkçe i/İ kuralıyla). Cam içinde camın soluk yazı rengini alır. */
export function Eyebrow({ text, color, style }: { text: string; color?: string; style?: StyleProp<TextStyle> }) {
  const t = useSweetTheme();
  const ink = useGlassInk();
  const { lang } = useT();
  return <Text style={[type.eyebrow, { color: color ?? ink?.muted ?? t.textMuted }, style]}>{upper(text, lang)}</Text>;
}

/** Liste satırı: solda simge, ortada başlık + açıklama, sağda ok ya da özel öğe. Kart içinde ince çizgiyle ayrılır. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  hint,
  first,
  danger,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  hint?: string;
  first?: boolean;
  danger?: boolean;
}) {
  const t = useSweetTheme();
  const ink = useGlassInk();
  const fg = ink?.text ?? t.text;
  const muted = ink?.muted ?? t.textMuted;
  const divider = t.outlined ? t.border : ink ? `${ink.text}1F` : t.border;
  const body = (
    <>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.itemTitle, { color: danger ? t.danger : fg }]}>{title}</Text>
        {subtitle ? <Text style={[type.meta, { color: muted }]}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <ChevronIcon color={muted} size={18} /> : null)}
    </>
  );
  const rowStyle = [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: divider }, !first && t.outlined && { borderTopWidth: 1 }];
  if (!onPress) {
    return (
      <View style={rowStyle} accessible accessibilityLabel={[title, subtitle].filter(Boolean).join(', ')}>
        {body}
      </View>
    );
  }
  return (
    <SoftPressable onPress={onPress} accessibilityRole="button" accessibilityLabel={[title, subtitle].filter(Boolean).join(', ')} accessibilityHint={hint} style={rowStyle}>
      {body}
    </SoftPressable>
  );
}

export function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  first,
  icon,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  first?: boolean;
  /** Solda simge (dekoratif). */
  icon?: (color: string) => ReactNode;
}) {
  const t = useSweetTheme();
  const ink = useGlassInk();
  const fg = ink?.text ?? t.text;
  const muted = ink?.muted ?? t.textMuted;
  const divider = t.outlined ? t.border : ink ? `${ink.text}1F` : t.border;
  return (
    <SoftPressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={[title, subtitle].filter(Boolean).join(', ')}
      style={[styles.row, !first && { borderTopWidth: t.outlined ? 1 : StyleSheet.hairlineWidth, borderTopColor: divider }]}>
      {icon ? icon(fg) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.itemTitle, { color: fg }]}>{title}</Text>
        {subtitle ? <Text style={[type.meta, { color: muted }]}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        // Kapalı iz de zeminden ayrılsın (≥ 3:1): açık/kapalı farkı ayrıca topun yerinde.
        trackColor={{ false: ink ? `${ink.text}40` : t.textMuted, true: t.primaryText }}
        thumbColor={t.surface}
        ios_backgroundColor={t.soft}
        importantForAccessibility="no"
        accessibilityElementsHidden
      />
    </SoftPressable>
  );
}

/** Seçeneklerden birini seçtiren yatay grup (radyo düğmesi semantiği): dolgulu hap ray, seçili parça mürekkep ve kalın. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const t = useSweetTheme();
  const ink = useGlassInk();
  const { fontScale } = useWindowDimensions();
  const railBg = t.outlined ? t.soft : ink ? `${t.surface}A6` : t.soft;
  const idleFg = ink?.muted ?? t.textMuted;
  return (
    <View
      style={[styles.segmented, { backgroundColor: railBg, flexDirection: fontScale > 1.5 ? 'column' : 'row' }, outline(t)]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <SoftPressable
            key={String(o.value)}
            onPress={() => {
              if (on) return;
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: on }}
            style={[styles.segment, on && { backgroundColor: t.primary.fill }]}>
            <Text style={[type.button, { fontSize: 15, color: on ? t.primary.ink : idleFg, textAlign: 'center', flexShrink: 1 }, !on && { fontFamily: type.meta.fontFamily }]}>{o.label}</Text>
          </SoftPressable>
        );
      })}
    </View>
  );
}

/** Seçim çipi: dolgulu hap; seçiliyken mürekkep dolgu ve kalın yazı (renk tek başına anlam taşımaz). */
export function Chip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: (color: string) => ReactNode }) {
  const t = useSweetTheme();
  const fg = selected ? t.primary.ink : t.text;
  return (
    <SoftPressable
      onPress={() => {
        if (!selected) void Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.chip, { backgroundColor: selected ? t.primary.fill : t.soft }, outline(t), selected && t.outlined && { borderWidth: 3 }]}>
      {icon ? icon(fg) : null}
      <Text style={[type.bubble, { color: fg, fontSize: 15, flexShrink: 1 }, !selected && { fontFamily: type.meta.fontFamily }]}>{label}</Text>
    </SoftPressable>
  );
}

/** Küçük durum etiketi (ör. "Basamaksız", "Ziyaret edildi", "Beklemede"). */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'accent' | 'danger' }) {
  const t = useSweetTheme();
  const c = {
    neutral: { bg: t.soft, fg: t.text },
    primary: { bg: t.primary.fill, fg: t.primary.ink },
    accent: { bg: t.accent.fill, fg: t.accent.ink },
    danger: { bg: t.soft, fg: t.danger },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, outline(t)]}>
      <Text style={[type.bubble, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body, icon, action }: { title: string; body?: string; icon?: ReactNode; action?: ReactNode }) {
  const t = useSweetTheme();
  return (
    <View style={styles.empty}>
      <EmptyMotif color={t.primaryText} />
      {icon}
      <Text style={[type.heading, { color: t.text, textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[type.body, { color: t.textMuted, textAlign: 'center' }]}>{body}</Text> : null}
      {action}
    </View>
  );
}

/**
 * Kaydırılabilir form kabı (`FormScreen`) sağlar: odaklanan alanı klavyenin üstüne getirir. Kabın dışında
 * kullanılan alanda yoktur (no-op).
 */
export const RevealContext = createContext<((target: View) => void) | null>(null);

/**
 * Metin alanı: üstte etiket, gri dolgulu 56 dp kutu, altında yardım ya da hata.
 * - Odakta kutu koyu firuze 2 dp çerçeve alır (renk tek başına değil: zemin de beyazlaşır); hata tehlike rengi + ikon + metin.
 * - `icon`: solda alanın ne istediğini gösteren küçük simge. `trailing`: sağda alan içi eylem (ör. şifreyi göster, ≥ 48 dp).
 * - Kutunun herhangi bir yerine dokunmak alanı odaklar; etiket ekran okuyucuda alanın adıdır.
 */
export function Field({
  label,
  error,
  help,
  icon,
  trailing,
  onFocus,
  onBlur,
  inputRef,
  ...input
}: TextInputProps & {
  label: string;
  error?: string;
  help?: string;
  icon?: (color: string) => ReactNode;
  trailing?: ReactNode;
  /** Klavyeden sonraki alana geçmek için ("İleri"). */
  inputRef?: RefObject<TextInput | null>;
}) {
  const t = useSweetTheme();
  const reveal = useContext(RevealContext);
  const box = useRef<View>(null);
  const own = useRef<TextInput>(null);
  const ref = inputRef ?? own;
  const [focused, setFocused] = useState(false);
  const border = error ? t.danger : focused ? t.primaryText : t.outlined ? t.border : t.soft;
  return (
    <View ref={box} style={{ gap: space.sm }} collapsable={false}>
      <Text style={[type.itemTitle, { color: t.text, fontSize: 16 }]}>{label}</Text>
      <Pressable
        onPress={() => ref.current?.focus()}
        accessible={false}
        style={[
          styles.field,
          { backgroundColor: focused ? t.surface : t.soft, borderColor: border },
          input.multiline && { minHeight: 120, alignItems: 'flex-start', paddingTop: space.md },
        ]}>
        {icon ? icon(focused ? t.primaryText : t.textMuted) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={t.textMuted}
          accessibilityLabel={label}
          accessibilityHint={error ?? help}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            if (box.current) reveal?.(box.current);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[type.body, styles.input, { color: t.text }, input.multiline && { minHeight: 100, textAlignVertical: 'top' }]}
        />
        {trailing}
      </Pressable>
      {error ? (
        <View style={styles.fieldMsg} accessibilityLiveRegion="polite">
          <InfoIcon color={t.danger} size={18} />
          <Text style={[type.meta, { color: t.danger, flex: 1 }]}>{error}</Text>
        </View>
      ) : help ? (
        <Text style={[type.meta, { color: t.textMuted }]}>{help}</Text>
      ) : null}
    </View>
  );
}

/** Bilgi notu (taslak, simülasyon, veri kaynağı açıklamaları): gri dolgulu kutu. */
export function Note({ text, icon }: { text: string; icon?: ReactNode }) {
  const t = useSweetTheme();
  return (
    <View style={[styles.note, { backgroundColor: t.soft }, outline(t)]}>
      {icon}
      <Text style={[type.meta, { color: t.textMuted, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 56,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompact: { minHeight: 48, paddingHorizontal: space.lg },
  btnArrow: { paddingRight: space.sm + 4, gap: space.md },
  arrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, paddingHorizontal: space.lg, paddingVertical: space.md },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, borderCurve: 'continuous', gap: 4 },
  segment: {
    flex: 1,
    minWidth: 48,
    minHeight: 48,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 48,
    minHeight: 48,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
  },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  input: { flex: 1, minHeight: 52, paddingVertical: space.sm, paddingRight: space.md },
  fieldMsg: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  note: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md, borderCurve: 'continuous' },
});
