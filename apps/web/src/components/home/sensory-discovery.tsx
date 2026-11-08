import type { Lang } from "@/lib/i18n";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { RichTitle } from "@/components/ui/rich-title";

type SensoryCopy = {
  sensoryEyebrow: string;
  sensoryTitle: string;
  sensoryIntro: string;
  sensorySee: string;
  sensorySeeBody: string;
  sensoryListen: string;
  sensoryListenBody: string;
  sensoryMotionLabel: string;
  sensoryFeel: string;
  sensoryFeelBody: string;
  sensoryQuote: string;
};

/** Ana sayfada eseri görme, dinleme ve sezme yollarını kompakt bir bantta anlatır. */
export function SensoryDiscovery({ lang, copy }: { lang: Lang; copy: SensoryCopy }) {
  return (
    <Reveal className="mx-auto max-w-[1280px] px-6 py-16 md:py-20">
      <div className="grid items-end gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(220px,.65fr)] md:gap-8">
        <div>
          <Eyebrow text={copy.sensoryEyebrow} lang={lang} className="text-[var(--brand-mark)]" />
          <RichTitle
            text={copy.sensoryTitle}
            className="mt-3 max-w-3xl text-[clamp(2.25rem,4.6vw,3.5rem)] leading-[0.98] tracking-[-0.04em]"
          />
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground md:pb-1">{copy.sensoryIntro}</p>
      </div>

      <div className="mt-7 grid gap-3 md:grid-cols-3">
        <article className="relative min-h-48 overflow-hidden rounded-[22px] bg-secondary p-5 text-secondary-foreground contrast:outline-2 contrast:-outline-offset-2 contrast:outline-border">
          <h3 className="relative z-10 text-[1.75rem] font-normal leading-none">{copy.sensorySee}</h3>
          <p className="relative z-10 mt-2 text-xs text-muted-foreground">{copy.sensorySeeBody}</p>
          <svg className="absolute -right-4 -bottom-5 h-[78%] w-[92%] text-[var(--brand-mark)] opacity-60" viewBox="0 0 300 180" aria-hidden="true">
            <path
              d="M-18 178V108h336v70M28 178V82h244v96M56 80h188Q230 8 150 8T56 80M42 178V34h16v144M242 178V28h16v150M94 178v-58h112v58M121 178v-34h58v34"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
        </article>

        <article className="relative min-h-48 overflow-hidden rounded-[22px] bg-[var(--tone-saffron-fill)] p-5 text-[var(--tone-saffron-ink)] contrast:outline-2 contrast:-outline-offset-2 contrast:outline-border">
          <h3 className="relative z-10 text-[1.75rem] font-normal leading-none">{copy.sensoryListen}</h3>
          <p className="relative z-10 mt-2 text-xs opacity-80">{copy.sensoryListenBody}</p>
          <svg
            className="absolute inset-x-0 bottom-7 h-[86px] w-full overflow-hidden text-[var(--brand-mark)]"
            viewBox="0 0 360 90"
            preserveAspectRatio="none"
            role="img"
            aria-label={copy.sensoryMotionLabel}
          >
            <path
              className="home-sound-flow"
              d="M-120 46C-90 12-60 12-30 46S30 80 60 46S120 12 150 46S210 80 240 46S300 12 330 46S390 80 420 46S480 12 510 46"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="4"
              opacity=".8"
            />
            <path
              className="home-sound-flow home-sound-flow-reverse"
              d="M-120 47C-80 27-40 27 0 47S80 67 120 47S200 27 240 47S320 67 360 47S440 27 480 47"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              opacity=".32"
            />
            <path
              className="home-sound-flow home-sound-flow-slow"
              d="M-120 45C-95 34-70 34-45 45S5 56 30 45S80 34 105 45S155 56 180 45S230 34 255 45S305 56 330 45S380 34 405 45S455 56 480 45"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.2"
              opacity=".18"
            />
          </svg>
        </article>

        <article className="relative min-h-48 overflow-hidden rounded-[22px] bg-[var(--brand-mark)] p-5 text-[var(--on-photo)] contrast:outline-2 contrast:-outline-offset-2 contrast:outline-border">
          <h3 className="text-[1.75rem] font-normal leading-none">{copy.sensoryFeel}</h3>
          <p className="mt-2 text-xs text-[var(--on-photo-muted)]">{copy.sensoryFeelBody}</p>
          <blockquote className="absolute right-5 bottom-5 left-5 font-heading text-[1.25rem] leading-[1.08]">“{copy.sensoryQuote}”</blockquote>
        </article>
      </div>
    </Reveal>
  );
}
