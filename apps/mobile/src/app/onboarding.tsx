import {
  BADGE_IDS,
  defaultSenses,
  distanceM,
  hasLocation,
  INTEREST_BADGES,
  PROFILE_INTERESTS,
  sweetThemes,
  type PlannedRoute,
  type ProfileInterest,
  type SweetTheme,
  type UserProfile,
  type WorkRow,
} from '@sezi/shared';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText, TextPath } from 'react-native-svg';

import { Glass } from '@/components/glass';
import { EffectLine, FrostPage, NavRow, ObBackdrop, obEase, PreviewCard, Question, Shade, StepDots, Tiles, usePageTone, Waves } from '@/components/onboarding/parts';
import { HearPreview, InterestPreview, MovePreview, WorkPreview } from '@/components/onboarding/previews';
import { StepSlider } from '@/components/onboarding/step-slider';
import { RichTitle } from '@/components/rich-title';
import { BadgeArt, badgeName } from '@/components/social-visuals';
import { Text } from '@/components/text';
import { Button, Segmented } from '@/components/ui';
import { ChevronIcon, CheckIcon, CompassIcon, PinIcon } from '@/design/icons';
import {
  BookIcon,
  CaneIcon,
  DomeIcon,
  EarIcon,
  EarLowIcon,
  HeadsetIcon,
  SeeIcon,
  SeeLowIcon,
  SeeNoneIcon,
  SeziMark,
  SparkIcon,
  VibrateIcon,
  WalkIcon,
  WheelchairIcon,
} from '@/design/sense-icons';
import { outline, SoftPressable } from '@/design/sweet/components';
import { font, radius, space, type, upper } from '@/design/type';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useIsDark, useSweetTheme } from '@/hooks/use-sweet-theme';
import { translate, type Lang, type MessageKey } from '@/lib/i18n';
import { defaultStart, inPilotArea, pilotWorks, planRoute } from '@/lib/nav';
import { useProfile } from '@/lib/profile';
import { DEFAULT_VISION_LOOK, LOW_VISION_DEFAULTS, useSettings } from '@/lib/settings';
import { photoUrl, useWorks } from '@/lib/works';

type Step = 'splash' | 'hello' | 'look' | 'vision' | 'hearing' | 'mobility' | 'interests' | 'senses' | 'ready' | 'motive';
/** İlk kurulum: açılış, hoş geldin, altı numaralı adım (görünüm → hazır) ve "Etrafı keşfet". */
const FIRST_RUN: Step[] = ['splash', 'hello', 'look', 'vision', 'hearing', 'mobility', 'interests', 'ready', 'motive'];
/** Profili düzenleme: numaralı adımlar ve yalnız burada açılan yönlendirme biçimi (duyular) adımı. */
const EDITING: Step[] = ['look', 'vision', 'hearing', 'mobility', 'interests', 'senses', 'ready'];
const UNNUMBERED: Step[] = ['splash', 'hello', 'motive'];
const MOTIVE_KEY = 'sezi.motive.seen';
const MOBILITIES: readonly UserProfile['mobility'][] = ['none', 'cane', 'wheelchair'];

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Ekran geçişi (taslak: 500 ms opaklık + 1.02'den ölçek). Hareket azaltmada yalnız kısa opaklık. */
const enterFull: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 1.02 }] },
    animations: {
      opacity: withTiming(1, { duration: 500, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }),
      transform: [{ scale: withTiming(1, { duration: 500, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }) }],
    },
  };
};

export default function Onboarding() {
  const { profile, saveProfile } = useProfile();
  // Profil kaydedilince akışın ortasında düzenleme moduna geçilmemeli.
  const [editing] = useState(profile !== null);
  const [onboardedAt] = useState(() => profile?.onboardedAt ?? new Date().toISOString());
  const params = useLocalSearchParams<{ step?: string }>();
  const steps = editing ? EDITING : FIRST_RUN;
  const [step, setStep] = useState<Step>(() => {
    if (!editing) return 'splash';
    const requested = params.step === 'lang' ? 'look' : params.step;
    return EDITING.find((x) => x === requested) ?? 'look';
  });
  const [lang, setLang] = useState<Lang>(profile?.lang ?? 'tr');
  const [vision, setVision] = useState<UserProfile['vision']>(profile?.vision ?? 'full');
  const [hearing, setHearing] = useState<UserProfile['hearing']>(profile?.hearing ?? 'full');
  const [mobility, setMobility] = useState<UserProfile['mobility']>(profile?.mobility ?? 'none');
  const [senses, setSenses] = useState<UserProfile['senses']>(profile?.senses ?? defaultSenses('full'));
  const [interests, setInterests] = useState<ProfileInterest[]>(profile?.interests ?? ['cami', 'han']);
  const [reader, setReader] = useState(false);
  const [position, setPosition] = useState<Location.LocationObjectCoords | null>(null);
  const { update } = useSettings();
  const reduced = useReducedMotion();
  const { data: works = [] } = useWorks();
  const tr: Translate = (key, vars) => translate(lang, key, vars);

  const build = (): UserProfile => ({ lang, vision, hearing, mobility, senses, interests, onboardedAt });

  const photos = useMemo(
    () => works.filter((w) => pilotWorks.some((p) => p.workSlug === w.slug) && w.photos.length > 0).sort((a, b) => a.slug.localeCompare(b.slug)),
    [works],
  );
  // Önizleme eseri: fotoğraflı ve yapım yılı bilinen ilk pilot eser (yıl satırı uydurulmaz; yoksa çizilmez).
  const previewWork = useMemo(() => photos.find((w) => w.built_year) ?? photos[0], [photos]);
  const bgFor = (s: Step): string | undefined => {
    const order = FIRST_RUN.indexOf(s === 'senses' ? 'interests' : s);
    const w = photos.length ? photos[(order + 1) % photos.length] : undefined;
    const p = w?.photos[0];
    return p ? photoUrl(p) : undefined;
  };
  useEffect(() => {
    // Adım fotoğrafları önceden indirilir: geçişte boş zemin görünmesin.
    const urls = photos.slice(0, FIRST_RUN.length + 1).flatMap((w) => (w.photos[0] ? [photoUrl(w.photos[0])] : []));
    if (urls.length) void Image.prefetch(urls).catch(() => {});
  }, [photos]);

  // Rota önizlemesinin hedefi veriden seçilir: yürüyen rotası basamaklı, tekerlekli rotası basamaksız ilk pilot eser
  // (profil farkı haritada görünsün). Böyle eser yoksa ilk pilot eser.
  const target = useMemo(() => {
    const plan = (slug: string, m: UserProfile['mobility']) =>
      planRoute(slug, { lang: 'tr', vision: 'full', hearing: 'full', mobility: m, senses: defaultSenses('full') }, defaultStart());
    const candidates = pilotWorks.filter((p) => p.workSlug);
    const differs = candidates.find((p) => {
      const walk = plan(p.workSlug ?? '', 'none');
      const chair = plan(p.workSlug ?? '', 'wheelchair');
      return walk !== null && chair !== null && walk.stairSegments > 0 && chair.stairSegments === 0;
    });
    return differs ?? candidates[0];
  }, []);
  const routes = useMemo(() => {
    const slug = target?.workSlug;
    const out: Record<UserProfile['mobility'], PlannedRoute | null> = { none: null, cane: null, wheelchair: null };
    if (!slug) return out;
    for (const m of MOBILITIES) out[m] = planRoute(slug, { lang, vision, hearing, mobility: m, senses }, defaultStart());
    return out;
  }, [target?.workSlug, lang, vision, hearing, senses]);
  const route = routes[mobility];
  // Önizlemedeki rehber cümlesi rotanın gerçek talimatıdır (yer işaretli ilk adım; yoksa ikinci, yoksa ilk).
  const guide = route ? (route.steps.find((st, i) => i > 0 && st.landmark)?.text ?? route.steps[1]?.text ?? route.steps[0]?.text) : undefined;

  const nearby = useMemo(() => {
    if (!position || !inPilotArea([position.longitude, position.latitude])) return null;
    const matches = works.filter(hasLocation).filter((w) => distanceM([position.longitude, position.latitude], [w.lng, w.lat]) <= 500);
    return { count: matches.length, district: matches.find((w) => w.district)?.district };
  }, [position, works]);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((v) => alive && setReader(v));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setReader);
    // Konum yalnız izin zaten verilmişse okunur; kurulumda izin istenmez.
    void Location.getForegroundPermissionsAsync()
      .then(async (permission) => {
        if (!permission.granted) return;
        const fix = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (alive && fix) setPosition(fix.coords);
      })
      .catch(() => {});
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const index = steps.indexOf(step);
  const numbered = steps.filter((s) => !UNNUMBERED.includes(s));
  const number = numbered.indexOf(step) + 1;

  const go = (next: Step) => {
    setStep(next);
    // İlk kurulumda Hoş Geldin damgası "Hazır"a gelince basılır: profil o an kaydedilir (kurulum zamanıyla).
    if (next === 'ready' && !editing) {
      saveProfile(build());
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AccessibilityInfo.announceForAccessibility(`${tr('onb.firstStamp')}: ${badgeName('15-hos-geldin', tr)}`);
    }
  };
  const finish = () => {
    saveProfile(build());
    if (editing && router.canGoBack()) router.back();
    else router.replace('/');
  };
  const next = () => {
    if (step === 'ready') {
      if (editing || Storage.getItemSync(MOTIVE_KEY)) finish();
      else go('motive');
      return;
    }
    if (step === 'motive') {
      Storage.setItemSync(MOTIVE_KEY, '1');
      finish();
      return;
    }
    const following = steps[index + 1];
    if (following) go(following);
  };
  const back = () => {
    if (index > 0) setStep(steps[index - 1] ?? step);
    else if (router.canGoBack()) router.back();
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'motive' || index <= 0) return false;
      setStep(steps[index - 1] ?? step);
      return true;
    });
    return () => sub.remove();
  }, [step, index, steps]);

  const pickVision = (v: UserProfile['vision']) => {
    if (v === 'low' && vision !== 'low') update(LOW_VISION_DEFAULTS);
    if (v !== 'low' && vision === 'low') update(DEFAULT_VISION_LOOK);
    setVision(v);
    setSenses(editing && profile && v === profile.vision && hearing === profile.hearing ? profile.senses : defaultSenses(v, hearing));
  };
  const pickHearing = (h: UserProfile['hearing']) => {
    setHearing(h);
    if (h === 'deaf' && h !== hearing) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSenses(editing && profile && h === profile.hearing && vision === profile.vision ? profile.senses : defaultSenses(vision, h));
  };
  const toggleInterest = (k: ProfileInterest) => {
    void Haptics.selectionAsync();
    setInterests((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : PROFILE_INTERESTS.filter((x) => prev.includes(x) || x === k)));
  };
  const canContinue = step !== 'senses' || senses.audio || senses.haptic || senses.visual;

  const dots = number > 0 ? <StepDots n={number} total={numbered.length} label={tr('onb.step', { n: number, total: numbered.length })} lang={lang} /> : null;
  const nav = (label: string = tr('onb.next')) => (
    <NavRow onBack={index > 0 || editing ? back : undefined} backLabel={tr('onb.back')} onNext={next} nextLabel={label} disabled={!canContinue} />
  );

  let screen: ReactNode;
  if (step === 'splash') screen = <Splash bg={bgFor('splash')} tr={tr} onStart={next} />;
  else if (step === 'hello')
    screen = (
      <Hello bg={bgFor('hello')} tr={tr} lang={lang} reader={reader} onLang={setLang} onNext={next} />
    );
  else if (step === 'ready')
    screen = (
      <Ready
        bg={bgFor('ready')}
        tr={tr}
        lang={lang}
        dots={dots}
        editing={editing}
        lines={readyLines(tr, { vision, hearing, mobility, interests })}
        onEdit={(s) => setStep(s)}
        onNext={next}
      />
    );
  else if (step === 'motive') screen = <Motive bg={bgFor('motive')} tr={tr} nearby={nearby} onNext={next} />;
  else
    screen = (
      <StepScreen
        bg={bgFor(step)}
        dots={dots}
        preview={
          step === 'senses' ? null : (
            <StepPreview
              step={step}
              tr={tr}
              lang={lang}
              work={previewWork}
              vision={vision}
              hearing={hearing}
              mobility={mobility}
              interests={interests}
              routes={routes}
              route={route}
              targetName={target?.name?.[lang] ?? target?.name?.tr ?? ''}
              guide={guide}
            />
          )
        }>
        {step === 'look' ? (
          <LookPage tr={tr} lang={lang} editing={editing} onLang={setLang} />
        ) : step === 'vision' ? (
          <>
            <Question text={tr('onb.vision.title')} />
            <Tiles
              label={tr('profile.vision')}
              value={vision}
              onChange={pickVision}
              options={[
                { value: 'full', label: tr('onb.vision.full'), icon: (c) => <SeeIcon color={c} /> },
                { value: 'low', label: tr('onb.vision.low'), icon: (c) => <SeeLowIcon color={c} /> },
                { value: 'blind', label: tr('onb.vision.blind'), icon: (c) => <SeeNoneIcon color={c} /> },
              ]}
            />
            <EffectLine text={tr(`onb.vision.${vision}.d`)} />
          </>
        ) : step === 'hearing' ? (
          <>
            <Question text={tr('onb.hearing.title')} />
            <Tiles
              label={tr('profile.hearing')}
              value={hearing}
              onChange={pickHearing}
              options={[
                { value: 'full', label: tr('onb.hearing.full'), icon: (c) => <EarIcon color={c} /> },
                { value: 'hard', label: tr('onb.hearing.hard'), icon: (c) => <EarLowIcon color={c} /> },
                { value: 'deaf', label: tr('onb.hearing.deaf'), icon: (c) => <VibrateIcon color={c} /> },
              ]}
            />
            <EffectLine text={tr(`onb.hearing.${hearing}.d`)} />
          </>
        ) : step === 'mobility' ? (
          <>
            <Question text={tr('onb.mobility.title')} />
            <Tiles
              label={tr('profile.mobility')}
              value={mobility}
              onChange={setMobility}
              options={[
                { value: 'none', label: tr('onb.mobility.none'), icon: (c) => <WalkIcon color={c} /> },
                { value: 'cane', label: tr('onb.mobility.cane'), icon: (c) => <CaneIcon color={c} /> },
                { value: 'wheelchair', label: tr('onb.mobility.wheelchair'), icon: (c) => <WheelchairIcon color={c} /> },
              ]}
            />
            <EffectLine text={tr(`onb.mobility.${mobility}.d`)} />
          </>
        ) : step === 'interests' ? (
          <InterestsPage tr={tr} interests={interests} onToggle={toggleInterest} />
        ) : (
          <SensesPage tr={tr} senses={senses} onChange={setSenses} canContinue={canContinue} />
        )}
        {nav()}
      </StepScreen>
    );

  return (
    <View style={s.root}>
      {/* Açılışta sol yarım açık cam, diğer adımlarda üst kısım fotoğraf: çubuk simgeleri buna göre. */}
      <StatusBar style={step === 'splash' ? 'dark' : 'light'} />
      <Animated.View
        key={step}
        entering={reduced ? FadeIn.duration(150) : enterFull}
        exiting={reduced ? FadeOut.duration(100) : FadeOut.duration(300)}
        style={StyleSheet.absoluteFill}>
        {screen}
      </Animated.View>
    </View>
  );
}

// ---------- 01 Açılış ----------

function Splash({ bg, tr, onStart }: { bg: string | undefined; tr: Translate; onStart: () => void }) {
  const t = useSweetTheme();
  const tone = usePageTone();
  const insets = useSafeAreaInsets();
  const ink = t.glass[tone].text;
  const cream = t.outlined ? ink : t.onPhoto.text;
  const senses: [MessageKey, boolean][] = [
    ['onb.sense.see', false],
    ['onb.sense.hear', false],
    ['onb.sense.touch', false],
    ['onb.sense.sez', true],
  ];
  return (
    <ObBackdrop uri={bg} shade="none">
      {/* Fotoğraf yarısı hafif koyulaşır: krem E, İ ve yol çizgisi parlak fotoğrafta da okunur. */}
      <Svg style={s.splashShade} accessible={false} pointerEvents="none">
        <Defs>
          <LinearGradient id="ob-splash-shade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={t.glass.dark.tint} stopOpacity={0.42} />
            <Stop offset="1" stopColor={t.glass.dark.tint} stopOpacity={0.18} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#ob-splash-shade)" />
      </Svg>
      <Glass tone={tone} style={s.splashHalf}>
        <View style={[s.splashText, { bottom: insets.bottom + 120 }]}>
          <RichTitle text={tr('onb.splash')} style={{ fontFamily: font.serifItalic, fontSize: 24, lineHeight: 26, color: ink }} />
        </View>
      </Glass>
      <View style={[s.logoLeft, { top: insets.top + 8 }]} importantForAccessibility="no-hide-descendants">
        <SeziMark color={ink} width={40} />
        <Text style={{ fontFamily: font.serif, fontSize: 23, color: ink }}>Sezi</Text>
      </View>
      <Svg style={[s.flow, { top: insets.top + 56 }]} viewBox="0 0 368 420" accessible={false} pointerEvents="none">
        <Path
          d="M190 10 C 170 50, 230 60, 205 100 S 120 120, 140 160 S 260 170, 240 215 S 130 240, 150 285 S 250 300, 230 345 S 170 380, 200 415"
          fill="none"
          stroke={cream}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <SvgText x={110} y={75} fill={ink} fontSize={62} fontFamily={font.serif}>
          S
        </SvgText>
        <SvgText x={90} y={250} fill={ink} fontSize={62} fontFamily={font.serif}>
          Z
        </SvgText>
        {/* Krem harfler fotoğrafın üstünde: altlarında yumuşak koyu gölge kopyası. */}
        {(
          [
            ['E', 240, 160],
            ['İ', 255, 335],
          ] as const
        ).map(([letter, x, y]) => (
          <G key={letter}>
            <SvgText x={x + 1.5} y={y + 2.5} fill={t.glass.dark.tint} fillOpacity={0.55} fontSize={62} fontFamily={font.serif}>
              {letter}
            </SvgText>
            <SvgText x={x} y={y} fill={cream} fontSize={62} fontFamily={font.serif}>
              {letter}
            </SvgText>
          </G>
        ))}
      </Svg>
      <View style={[s.senses, { bottom: insets.bottom + 46 }]} importantForAccessibility="no-hide-descendants">
        {senses.map(([key, gold]) => (
          <View key={key} style={[s.sensePill, gold ? { backgroundColor: t.gold.fill } : { backgroundColor: `${t.glass.dark.tint}8C`, borderColor: `${t.onPhoto.text}2E`, borderWidth: 1 }]}>
            <Text style={[type.tab, { letterSpacing: 2, fontSize: 12, color: gold ? t.gold.ink : t.glass.dark.text }]}>{upper(tr(key), 'tr')}</Text>
          </View>
        ))}
      </View>
      <SoftPressable feedback="opacity" style={StyleSheet.absoluteFill} onPress={onStart} accessibilityRole="button" accessibilityLabel={tr('onb.begin')} />
    </ObBackdrop>
  );
}

// ---------- 02 Hoş geldin ----------

function Hello({
  bg,
  tr,
  lang,
  reader,
  onLang,
  onNext,
}: {
  bg: string | undefined;
  tr: Translate;
  lang: Lang;
  reader: boolean;
  onLang: (l: Lang) => void;
  onNext: () => void;
}) {
  const t = useSweetTheme();
  const ink = t.glass[usePageTone()];
  const insets = useSafeAreaInsets();
  return (
    <ObBackdrop uri={bg} shade="top">
      <View style={[s.logoTop, { top: insets.top + 8 }]} importantForAccessibility="no-hide-descendants">
        <SeziMark color={t.onPhoto.text} width={40} />
        <Text style={{ fontFamily: font.serif, fontSize: 23, color: t.onPhoto.text }}>Sezi</Text>
      </View>
      <View style={s.bottom}>
        <FrostPage style={{ paddingTop: 26, paddingBottom: insets.bottom + 24 }}>
          <Text style={[type.eyebrow, { color: t.primaryText }]}>{upper(tr('onb.helloEyebrow'), lang)}</Text>
          <Question text={tr('onb.hello')} size={38} />
          <Text style={[type.meta, { color: ink.muted, fontSize: 14 }]}>{tr('onb.helloWhy')}</Text>
          <PillSeg
            label={tr('profile.lang')}
            value={lang}
            onChange={onLang}
            options={[
              { value: 'tr', label: tr('onb.language.tr') },
              { value: 'en', label: tr('onb.language.en') },
            ]}
          />
          {reader ? (
            <View style={[s.reader, { backgroundColor: t.outlined ? t.surface : `${t.tones.teal.ink}1F` }, outline(t)]}>
              <Waves heights={[8, 14, 10]} color={t.tones.teal.ink} />
              <Text style={[type.meta, { color: t.tones.teal.ink, flex: 1, fontSize: 13 }]}>
                <Text style={{ fontFamily: font.bodyBold }}>{tr('onb.readerTitle')}</Text> {tr('onb.reader')}
              </Text>
            </View>
          ) : null}
          <Button arrow label={tr('onb.beginTogether')} onPress={onNext} />
        </FrostPage>
      </View>
    </ObBackdrop>
  );
}

/** Hap düğmeli tek seçim (dil): taslaktaki `seg`. Seçili hap mürekkep ve kalın. */
function PillSeg<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const t = useSweetTheme();
  const ink = t.glass[usePageTone()];
  return (
    <View style={s.seg} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <SoftPressable
            key={o.value}
            onPress={() => {
              if (on) return;
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            style={[s.segItem, { backgroundColor: on ? t.primary.fill : `${t.surface}99` }, outline(t)]}>
            <Text style={[type.bubble, { color: on ? t.primary.ink : ink.text }, !on && { fontFamily: font.body }]}>{o.label}</Text>
          </SoftPressable>
        );
      })}
    </View>
  );
}

// ---------- Numaralı adımlar ----------

function StepScreen({ bg, dots, preview, children }: { bg: string | undefined; dots: ReactNode; preview: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ObBackdrop uri={bg} shade="top">
      <View style={[s.obtop, { paddingTop: insets.top + 8 }]}>{dots}</View>
      <ScrollView contentContainerStyle={[s.stepScroll, !preview && { justifyContent: 'flex-end' }]} bounces={false} showsVerticalScrollIndicator={false}>
        {preview}
        <FrostPage style={{ marginTop: 18, paddingBottom: insets.bottom + 24 }}>{children}</FrostPage>
      </ScrollView>
    </ObBackdrop>
  );
}

function StepPreview({
  step,
  tr,
  lang,
  work,
  vision,
  hearing,
  mobility,
  interests,
  routes,
  route,
  targetName,
  guide,
}: {
  step: Step;
  tr: Translate;
  lang: Lang;
  work: WorkRow | undefined;
  vision: UserProfile['vision'];
  hearing: UserProfile['hearing'];
  mobility: UserProfile['mobility'];
  interests: ProfileInterest[];
  routes: Record<UserProfile['mobility'], PlannedRoute | null>;
  route: PlannedRoute | null;
  targetName: string;
  guide: string | undefined;
}) {
  const night = useIsDark();
  const thumb = work?.photos[0] ? photoUrl(work.photos[0], 'thumb') : undefined;
  const live = tr('onb.livePreview');
  if (step === 'look' || step === 'vision')
    return (
      <PreviewCard label={live} lang={lang} photo={thumb}>
        <WorkPreview work={work} lang={lang} night={night} vision={step === 'vision' ? vision : 'full'} guide={guide} guideLabel={tr('onb.audioGuide')} />
      </PreviewCard>
    );
  if (step === 'hearing') {
    const text = guide ?? '';
    return (
      <PreviewCard label={live} lang={lang} photo={thumb} flash={hearing === 'deaf'}>
        {text ? <HearPreview hearing={hearing} text={hearing === 'deaf' ? tr('onb.deafPreview', { text }) : text} /> : null}
      </PreviewCard>
    );
  }
  if (step === 'mobility') {
    const stat = route
      ? `${route.stairSegments ? tr('onb.stairs', { n: route.stairSegments }) : tr('onb.free')} · ${Math.round(route.route.lengthM)} m`
      : null;
    return (
      <PreviewCard label={live} lang={lang} dark>
        <MovePreview routes={routes} mobility={mobility} target={tr('onb.moveTo', { name: targetName })} stat={stat} />
      </PreviewCard>
    );
  }
  return (
    <PreviewCard label={tr('onb.interests.label')} lang={lang} dark>
      <InterestPreview selected={interests} />
    </PreviewCard>
  );
}

function LookPage({ tr, lang, editing, onLang }: { tr: Translate; lang: Lang; editing: boolean; onLang: (l: Lang) => void }) {
  const t = useSweetTheme();
  const ink = t.glass[usePageTone()];
  const { settings, update } = useSettings();
  const night = useIsDark();
  const mode: 'light' | 'contrast' | 'dark' = settings.highContrast ? 'contrast' : night ? 'dark' : 'light';
  const themes: { key: 'light' | 'contrast' | 'dark'; theme: SweetTheme }[] = [
    { key: 'light', theme: sweetThemes.light },
    { key: 'contrast', theme: sweetThemes.highContrast },
    { key: 'dark', theme: sweetThemes.dark },
  ];
  return (
    <>
      <Question text={tr('onb.look')} />
      <Text style={[type.meta, { color: ink.muted, fontSize: 14 }]}>{tr('onb.lookWhy')}</Text>
      {editing ? (
        <Segmented
          label={tr('profile.lang')}
          value={lang}
          onChange={onLang}
          options={[
            { value: 'tr', label: tr('onb.language.tr') },
            { value: 'en', label: tr('onb.language.en') },
          ]}
        />
      ) : null}
      <StepSlider
        label={tr('onb.textSize')}
        values={['normal', 'large', 'xlarge'] as const}
        labels={{ normal: tr('onb.normal'), large: tr('onb.large'), xlarge: tr('onb.xlarge') }}
        value={settings.textScale}
        onChange={(v) => update({ textScale: v })}
      />
      <View style={s.themes} accessibilityRole="radiogroup" accessibilityLabel={tr('onb.themes')}>
        {themes.map(({ key, theme }) => {
          const on = mode === key;
          return (
            <SoftPressable
              key={key}
              onPress={() => {
                // Sistemden çözülen kart da dokununca açık bir tercihe dönüşür.
                if (on && (key === 'contrast' || settings.themeMode === key)) return;
                void Haptics.selectionAsync();
                update(key === 'contrast' ? { highContrast: true } : { highContrast: false, themeMode: key });
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={tr(`onb.${key}`)}
              style={[s.themeCard, { backgroundColor: `${t.surface}99`, borderColor: on ? t.text : 'transparent', borderWidth: on ? (t.outlined ? 3 : 1.5) : 1.5 }]}>
              <View style={[s.swatch, { backgroundColor: theme.background, borderColor: theme.outlined ? theme.border : ink.muted, borderWidth: theme.outlined ? 1.5 : StyleSheet.hairlineWidth }]}>
                <View style={[s.swatchBar, { backgroundColor: theme.text }]} />
                <View style={[s.swatchBar, { backgroundColor: theme.outlined ? theme.primaryText : theme.gold.fill }]} />
              </View>
              <View style={s.themeLabel}>
                <Text style={[type.bubble, { color: ink.text, fontSize: 12.5, flexShrink: 1 }]}>{tr(`onb.${key}`)}</Text>
                {on ? <CheckIcon color={ink.text} size={14} /> : null}
              </View>
            </SoftPressable>
          );
        })}
      </View>
    </>
  );
}

function InterestsPage({ tr, interests, onToggle }: { tr: Translate; interests: ProfileInterest[]; onToggle: (k: ProfileInterest) => void }) {
  const t = useSweetTheme();
  const ink = t.glass[usePageTone()];
  return (
    <>
      <Question text={tr('onb.interests.title')} />
      <Text style={[type.meta, { color: ink.muted, fontSize: 14 }]}>{tr('onb.interests.why')}</Text>
      <View style={s.chips}>
        {PROFILE_INTERESTS.map((k) => {
          const on = interests.includes(k);
          const label = tr(`onb.interest.${k}`);
          return (
            <SoftPressable
              key={k}
              onPress={() => onToggle(k)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${label}. ${badgeName(INTEREST_BADGES[k], tr)}`}
              style={[s.chip, { backgroundColor: on ? t.primary.fill : `${t.surface}99` }, outline(t), on && t.outlined && { borderWidth: 3 }]}>
              <BadgeArt id={INTEREST_BADGES[k]} size={30} locked={!on} />
              <Text style={[type.bubble, { fontSize: 13.5, color: on ? t.primary.ink : ink.text }, !on && { fontFamily: font.body }]}>{label}</Text>
            </SoftPressable>
          );
        })}
      </View>
    </>
  );
}

function SensesPage({
  tr,
  senses,
  onChange,
  canContinue,
}: {
  tr: Translate;
  senses: UserProfile['senses'];
  onChange: (v: UserProfile['senses']) => void;
  canContinue: boolean;
}) {
  const t = useSweetTheme();
  const ink = t.glass[usePageTone()];
  return (
    <>
      <Question text={tr('onb.senses.title')} />
      <Text style={[type.meta, { color: ink.muted, fontSize: 14 }]}>{tr('onb.senses.hint')}</Text>
      {(['audio', 'haptic', 'visual'] as const).map((k) => {
        const on = senses[k];
        return (
          <SoftPressable
            key={k}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange({ ...senses, [k]: !on });
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${tr(`onb.senses.${k}`)}. ${tr(`onb.senses.${k}.d`)}`}
            style={[s.option, { backgroundColor: on ? t.primary.fill : `${t.surface}99` }, outline(t)]}>
            <View style={[s.check, { borderColor: on ? t.primary.ink : ink.muted }]}>{on ? <CheckIcon color={t.primary.ink} size={14} /> : null}</View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.itemTitle, { color: on ? t.primary.ink : ink.text }]}>{tr(`onb.senses.${k}`)}</Text>
              <Text style={[type.meta, { color: on ? t.primary.ink : ink.muted, fontSize: 14 }]}>{tr(`onb.senses.${k}.d`)}</Text>
            </View>
          </SoftPressable>
        );
      })}
      {!canContinue ? (
        <Text style={[type.meta, { color: t.danger }]} accessibilityLiveRegion="polite">
          {tr('onb.senses.none')}
        </Text>
      ) : null}
    </>
  );
}

// ---------- 08 Hazır ----------

interface ReadyLine {
  key: string;
  edit: Step;
  text: string;
  icon: (color: string) => ReactNode;
}

function readyLines(
  tr: Translate,
  p: { vision: UserProfile['vision']; hearing: UserProfile['hearing']; mobility: UserProfile['mobility']; interests: ProfileInterest[] },
): ReadyLine[] {
  const seeIcon = { full: SeeIcon, low: SeeLowIcon, blind: HeadsetIcon }[p.vision];
  const hearIcon = { full: EarIcon, low: EarIcon, hard: EarLowIcon, deaf: VibrateIcon }[p.hearing];
  const moveIcon = { none: WalkIcon, cane: CaneIcon, wheelchair: WheelchairIcon }[p.mobility];
  const lines: ReadyLine[] = [
    { key: 'see', edit: 'vision', text: tr(`onb.line.see.${p.vision}`), icon: (c) => seeIcon({ color: c, size: 18 }) },
    { key: 'hear', edit: 'hearing', text: tr(`onb.line.hear.${p.hearing}`), icon: (c) => hearIcon({ color: c, size: 18 }) },
    { key: 'move', edit: 'mobility', text: tr(`onb.line.move.${p.mobility}`), icon: (c) => moveIcon({ color: c, size: 18 }) },
  ];
  if (p.interests.length) {
    const list = p.interests.map((k) => badgeName(INTEREST_BADGES[k], tr)).join(', ');
    lines.push({ key: 'goals', edit: 'interests', text: tr('onb.line.interests', { list }), icon: (c) => <SparkIcon color={c} size={16} /> });
  }
  return lines;
}

function Ready({
  bg,
  tr,
  lang,
  dots,
  editing,
  lines,
  onEdit,
  onNext,
}: {
  bg: string | undefined;
  tr: Translate;
  lang: Lang;
  dots: ReactNode;
  editing: boolean;
  lines: ReadyLine[];
  onEdit: (s: Step) => void;
  onNext: () => void;
}) {
  const t = useSweetTheme();
  const tone = usePageTone();
  const ink = t.glass[tone];
  const insets = useSafeAreaInsets();
  return (
    <ObBackdrop uri={bg} shade="none">
      <View style={[s.obtop, { paddingTop: insets.top + 8 }]}>{dots}</View>
      <Glass tone={tone} radius={34} style={[s.readyCard, { top: insets.top + 64, bottom: insets.bottom + 24 }]}>
        <ScrollView contentContainerStyle={s.readyScroll} showsVerticalScrollIndicator={false}>
          <Text style={[type.eyebrow, { color: t.primaryText }]}>{upper(tr('onb.readyEyebrow'), lang)}</Text>
          <RichTitle text={tr('onb.ready')} style={{ fontFamily: font.serif, fontSize: 38, lineHeight: 40, letterSpacing: -1.1 }} />
          {editing ? null : (
            <View style={s.earned}>
              <Pop>
                <BadgeArt id="15-hos-geldin" size={86} />
              </Pop>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.eyebrow, { color: t.primaryText }]}>{upper(tr('onb.firstStamp'), lang)}</Text>
                <Text style={{ fontFamily: font.serif, fontSize: 26, lineHeight: 30, color: ink.text }}>{badgeName('15-hos-geldin', tr)}</Text>
                <Text style={[type.meta, { fontSize: 13, color: ink.muted }]}>{tr('onb.firstStampMeta', { n: 1, total: BADGE_IDS.length })}</Text>
              </View>
            </View>
          )}
          <View style={s.lines}>
            {lines.map((line) => (
              <SoftPressable
                key={line.key}
                feedback="opacity"
                onPress={() => onEdit(line.edit)}
                accessibilityRole="button"
                accessibilityLabel={line.text}
                accessibilityHint={tr('onb.line.edit')}
                style={s.line}>
                <View style={[s.lineIcon, { backgroundColor: `${ink.text}14` }]}>{line.icon(t.primaryText)}</View>
                <Text style={[type.body, { flex: 1, fontSize: 15, lineHeight: 21, color: ink.text }]}>{line.text}</Text>
                <ChevronIcon color={ink.muted} size={16} />
              </SoftPressable>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Text style={[type.meta, { fontSize: 13, color: ink.muted }]}>{tr('onb.summary.change')}</Text>
          <Button arrow label={editing ? tr('onb.save') : tr('onb.explore')} onPress={onNext} />
        </ScrollView>
      </Glass>
    </ObBackdrop>
  );
}

/** Kazanılan damganın salınımı (taslaktaki `pop`, 1,8 s gidip gelir). Hareket azaltmada durur. */
function Pop({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(k);
      k.set(0.5);
      return;
    }
    k.set(withRepeat(withTiming(1, { duration: 1800, easing: obEase }), -1, true));
    return () => cancelAnimation(k);
  }, [reduced, k]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 0.94 + k.get() * 0.1 }, { rotate: `${-4 + k.get() * 7}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ---------- 09 Etrafı keşfet ----------

function Motive({
  bg,
  tr,
  nearby,
  onNext,
}: {
  bg: string | undefined;
  tr: Translate;
  nearby: { count: number; district: string | null | undefined } | null;
  onNext: () => void;
}) {
  const t = useSweetTheme();
  const insets = useSafeAreaInsets();
  const cream = t.onPhoto.text;
  return (
    // Cam kapsamı yok: Ken Burns her karede değişirken bulanıklık hesaplanmaz; koyu cam bulanıksız ve koyu çizilir.
    <View style={[StyleSheet.absoluteFill, s.root]}>
        <KenBurns uri={bg} />
        <Shade kind="full" />
        <View style={[s.logoTop, { top: insets.top + 8 }]} importantForAccessibility="no-hide-descendants">
          <SeziMark color={cream} width={40} />
          <Text style={{ fontFamily: font.serif, fontSize: 23, color: cream }}>Sezi</Text>
        </View>
        <Svg style={[s.curve, { top: insets.top + 56 }]} viewBox="0 0 368 200" accessible={false} pointerEvents="none">
          <Defs>
            <Path id="ob-ridge" d="M-10 135 C 60 135, 100 100, 165 100 S 260 122, 305 108 S 355 90, 395 90" fill="none" />
          </Defs>
          <SvgText fill={cream} fontSize={20} fontFamily={font.serifItalic}>
            <TextPath href="#ob-ridge" startOffset="6%">
              {tr('onb.curve')}
            </TextPath>
          </SvgText>
        </Svg>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 368 822" preserveAspectRatio="none" accessible={false} pointerEvents="none">
          <Path d="M-10 330 C 60 300, 90 250, 150 270 S 230 350, 290 300 S 340 230, 380 240" fill="none" stroke={cream} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="1 9" />
        </Svg>
        <MapPin left="42%" top="33.8%" pulse>
          <DomeIcon color={t.primaryText} size={16} />
        </MapPin>
        <MapPin left="79%" top="36.5%">
          <PinIcon color={t.primaryText} size={16} />
        </MapPin>
        <Glass tone="dark" radius={34} style={[s.motive, { bottom: insets.bottom + 12 }]}>
          {nearby ? (
            <View style={s.loc}>
              <View style={[s.locRing, { backgroundColor: `${sweetThemes.dark.tones.teal.ink}40` }]}>
                <View style={[s.locDot, { backgroundColor: sweetThemes.dark.tones.teal.ink }]} />
              </View>
              <Text style={[type.bubble, { color: t.glass.dark.text, fontSize: 12.5 }]}>
                {[nearby.district, tr('onb.within', { n: nearby.count })].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}
          <RichTitle text={tr('onb.motive')} onPhoto style={{ fontFamily: font.serif, fontSize: 56, lineHeight: 54, letterSpacing: -1.9 }} />
          <Text style={[type.body, { color: t.glass.dark.text, fontSize: 15.5, lineHeight: 22, opacity: 0.88 }]}>{tr('onb.motiveBody')}</Text>
          <View style={s.modes}>
            {(
              [
                ['onb.mode.listen', (c: string) => <HeadsetIcon color={c} />],
                ['onb.mode.read', (c: string) => <BookIcon color={c} />],
                ['onb.mode.explore', (c: string) => <CompassIcon color={c} size={22} />],
              ] as const
            ).map(([key, icon]) => (
              <View key={key} style={[s.mode, { backgroundColor: `${t.onPhoto.text}1F` }]}>
                {icon(t.outlined ? t.glass.dark.text : t.gold.fill)}
                <Text style={[type.tab, { color: t.glass.dark.text }]}>{tr(key)}</Text>
              </View>
            ))}
          </View>
          <Button variant="cream" arrow label={tr('onb.nearby')} onPress={onNext} />
        </Glass>
    </View>
  );
}

/** Son ekranın fotoğrafı 20 s'de yavaşça yakınlaşıp kayar (Ken Burns, gidip gelir). Hareket azaltmada sabit. */
function KenBurns({ uri }: { uri: string | undefined }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(k);
      k.set(0);
      return;
    }
    k.set(withRepeat(withTiming(1, { duration: 20000, easing: Easing.inOut(Easing.ease) }), -1, true));
    return () => cancelAnimation(k);
  }, [reduced, k]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + k.get() * 0.12 }, { translateX: k.get() * -12 }] }));
  if (!uri) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: '30%' }} />
    </Animated.View>
  );
}

/** Fotoğraf üstündeki süs işareti (konum iddiası taşımaz); biri halkayla nabız atar. */
function MapPin({ left, top, pulse, children }: { left: `${number}%`; top: `${number}%`; pulse?: boolean; children: ReactNode }) {
  const t = useSweetTheme();
  const reduced = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => {
    if (!pulse || reduced) {
      cancelAnimation(k);
      k.set(0);
      return;
    }
    k.set(withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) })), -1));
    return () => cancelAnimation(k);
  }, [pulse, reduced, k]);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - k.get(), transform: [{ scale: 0.7 + k.get() * 0.9 }] }));
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={[s.pin, { left, top, backgroundColor: t.onPhoto.text }]}>
      {pulse && !reduced ? <Animated.View style={[s.pinRing, { borderColor: t.onPhoto.text }, ring]} /> : null}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: sweetThemes.dark.background },
  splashHalf: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '52%' },
  splashShade: { position: 'absolute', left: '52%', top: 0, bottom: 0, right: 0 },
  splashText: { position: 'absolute', left: 24, right: 18 },
  logoLeft: { position: 'absolute', left: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoTop: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  flow: { position: 'absolute', left: 0, right: 0, height: 420 },
  senses: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  sensePill: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  reader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18 },
  seg: { flexDirection: 'row', gap: 6 },
  segItem: { flex: 1, minHeight: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  obtop: { paddingHorizontal: 14, flexDirection: 'row' },
  stepScroll: { flexGrow: 1, justifyContent: 'space-between', paddingTop: 14 },
  themes: { flexDirection: 'row', gap: 8 },
  themeCard: { flex: 1, borderRadius: 18, padding: 8, gap: 6 },
  swatch: { height: 34, borderRadius: 10, flexDirection: 'row', alignItems: 'flex-end', padding: 5, gap: 4 },
  swatchBar: { flex: 1, height: 5, borderRadius: 3 },
  themeLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 48, paddingVertical: 5, paddingLeft: 9, paddingRight: 14, borderRadius: radius.pill },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, padding: space.md, borderRadius: 22 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  readyCard: { position: 'absolute', left: 16, right: 16 },
  readyScroll: { flexGrow: 1, paddingVertical: 24, paddingHorizontal: 22, gap: space.md },
  earned: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 6 },
  lines: { gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  lineIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  curve: { position: 'absolute', left: 0, right: 0, height: 200 },
  pin: { position: 'absolute', width: 36, height: 36, marginLeft: -18, marginTop: -18, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pinRing: { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: 26, borderWidth: 2 },
  motive: { position: 'absolute', left: 12, right: 12, paddingVertical: 22, paddingHorizontal: 20, gap: 12 },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locRing: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  locDot: { width: 8, height: 8, borderRadius: 4 },
  modes: { flexDirection: 'row', gap: 6 },
  mode: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 18 },
});
