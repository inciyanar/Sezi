"use client";

import type { AskCitation } from "@sezi/shared";
import { ArrowUpIcon, BookOpenIcon, ChevronDownIcon, InfoIcon, RotateCcwIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { href } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

import type { Turn } from "./ask-cat";

const MAX = 240;
/** Giriş: hafif yükselip belirir (tek sefer, @starting-style). Hareket azaltmada genel kural süreyi sıfırlar. */
const ENTER = "transition-[opacity,translate] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-1.5 starting:opacity-0";

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Sezi'ye Sor kartı: kedinin yanında açılan not kartı. Boyu sabittir (soru, bekleme ve cevap arasında kart
 * zıplamaz). Boşken kısa açıklama ve üç öneri; sonra soru-cevap dizisi. Yeni soru listenin başına kayar ki cevap
 * baştan okunsun. Cevaptaki [n] işareti o kaynağı açar ve görünür yapar.
 */
export function AskPanel({
  turns,
  workSlug,
  onAsk,
  onRetry,
  onReset,
}: {
  turns: Turn[];
  workSlug: string | null;
  onAsk: (question: string) => void;
  onRetry: (turn: Turn) => void;
  onReset: () => void;
}) {
  const { t } = useT();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Kaydırma alanının görünen boyu: son soru-cevap en az bu kadar yer tutar ki yeni soru her zaman başa gelebilsin.
  const [viewH, setViewH] = useState(0);
  const pending = turns.some((x) => x.status === "pending");
  const last = turns.at(-1);

  useEffect(() => {
    inputRef.current?.focus();
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => setViewH(list.clientHeight));
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  // Yeni soru (ya da kart yeniden açılınca son soru) kaydırma alanının başına gelir; cevap uzunsa baştan okunur.
  useLayoutEffect(() => {
    const list = listRef.current;
    // Soru metnine kaydırılır; üstteki ayırıcı çizgi görünür alanın dışında kalır.
    const item = list?.querySelector<HTMLElement>("[data-turn]:last-child > p");
    if (list && item) list.scrollTo({ top: item.offsetTop - 16, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [turns.length, viewH]);

  const suggestions = workSlug
    ? [t("ask.suggest.workWhen"), t("ask.suggest.workArchitecture"), t("ask.suggest.workStory")]
    : [t("ask.suggest.history"), t("ask.suggest.architecture"), t("ask.suggest.explore")];

  const send = (question: string) => {
    if (!question.trim() || pending) return;
    onAsk(question);
    setInput("");
    // Öneri düğmesi kaybolunca odak boşa düşmesin.
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-[min(32rem,calc(100dvh-11rem))] flex-col">
      <div className="flex items-center gap-1 border-b py-2 pr-2 pl-4 contrast:border-b-2 contrast:border-foreground">
        <h2 className="flex-1 font-heading text-lg font-extrabold">{t("ask.title")}</h2>
        {turns.length > 0 && !pending ? (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onReset}>
            <RotateCcwIcon aria-hidden />
            {t("ask.newChat")}
          </Button>
        ) : null}
        <PopoverPrimitive.Close asChild>
          <Button variant="ghost" size="icon" aria-label={t("ask.close")}>
            <XIcon aria-hidden />
          </Button>
        </PopoverPrimitive.Close>
      </div>

      <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {turns.length === 0 ? (
          <div className="flex flex-col gap-4">
            <p className={cn("text-muted-foreground", ENTER)}>{t(workSlug ? "ask.introWork" : "ask.intro")}</p>
            <ul className="flex flex-col gap-2">
              {suggestions.map((q, i) => (
                <li key={q} className={ENTER} style={{ transitionDelay: `${60 + i * 50}ms` }}>
                  <button
                    type="button"
                    onClick={() => send(q)}
                    className="min-h-12 w-full rounded-xl bg-secondary px-4 py-2.5 text-left font-semibold transition-[background-color,scale] duration-150 ease-out hover:bg-muted active:scale-[0.98] contrast:bg-background contrast:outline-2 contrast:outline-foreground"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
            <details className="group text-sm">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 font-semibold text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                <InfoIcon className="size-4" aria-hidden />
                {t("ask.how")}
                <ChevronDownIcon className="size-4 transition-transform duration-200 ease-out group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-1 text-muted-foreground">{t("ask.howBody")}</p>
            </details>
          </div>
        ) : (
          <ol className="flex flex-col">
            {turns.map((turn) => (
              <li
                key={turn.id}
                data-turn
                // Görünen boy - üst/alt boşluk (32) + sorunun üstündeki ayırıcı ve boşluk (21).
                style={turn === last && turns.length > 1 ? { minHeight: Math.max(0, viewH - 11) } : undefined}
                className="flex flex-col gap-2 border-border not-first:mt-5 not-first:border-t not-first:pt-5 contrast:not-first:border-foreground"
              >
                <p className={cn("font-heading font-bold", ENTER)}>
                  <span className="sr-only">{t("ask.you")}: </span>
                  {turn.question}
                </p>
                {turn.status === "pending" ? (
                  // Bekleme: yazının üstünden ışık geçer (kedi de kitabını karıştırır).
                  <p className="animate-shimmer bg-[linear-gradient(90deg,var(--muted-foreground)_35%,var(--foreground)_50%,var(--muted-foreground)_65%)] bg-size-[250%_100%] bg-clip-text text-transparent">
                    {t("ask.thinking")}
                  </p>
                ) : turn.status === "failed" ? (
                  <div className={cn("flex flex-col items-start gap-2 rounded-xl bg-secondary p-3 contrast:bg-background contrast:outline-2 contrast:outline-foreground", ENTER)}>
                    <p>{t(`ask.fail.${turn.failure ?? "service"}`)}</p>
                    {turn.failure !== "quota" && turn === last ? (
                      <Button size="sm" variant="outline" className="min-h-11" onClick={() => onRetry(turn)}>
                        {t("ask.retry")}
                      </Button>
                    ) : null}
                  </div>
                ) : turn.answer ? (
                  <Answer text={turn.answer.answer} citations={turn.answer.citations} workSlug={workSlug} />
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Ekran okuyucu yeni cevabı bir kez duyar. */}
      <p className="sr-only" aria-live="polite">
        {last?.status === "pending" ? t("ask.thinking") : last?.status === "done" ? last.answer?.answer : last?.status === "failed" ? t(`ask.fail.${last.failure ?? "service"}`) : ""}
      </p>

      <form
        className="flex items-end gap-2 border-t p-3 contrast:border-t-2 contrast:border-foreground"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        {/* Uzun soru alanı büyütür (en çok 4 satır); Enter gönderir, Shift+Enter alt satıra geçer. */}
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          maxLength={MAX}
          placeholder={t("ask.placeholder")}
          aria-label={t("ask.placeholder")}
          aria-describedby={input.length >= 200 ? "ask-limit" : undefined}
          className="field-sizing-content max-h-32 min-h-12 min-w-0 flex-1 resize-none rounded-xl bg-secondary px-4 py-3 leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring contrast:bg-background contrast:outline-2 contrast:outline-foreground"
        />
        <Button
          type="submit"
          size="icon"
          className="size-12 rounded-xl transition-[background-color,opacity,scale] duration-150 ease-out active:scale-[0.97]"
          aria-label={t("ask.send")}
          disabled={!input.trim() || pending}
        >
          <ArrowUpIcon aria-hidden />
        </Button>
      </form>
      {input.length >= 200 ? (
        <p id="ask-limit" className="-mt-1 px-4 pb-2 text-right text-sm text-muted-foreground">
          {t("ask.limit", { n: input.length })}
        </p>
      ) : null}
    </div>
  );
}

/** Cevap metni; [n] işaretleri tıklanınca o kaynak listede açılır, öne çıkar ve görünür olur. Açık olan eserin bağlantısı gösterilmez. */
function Answer({ text, citations, workSlug }: { text: string; citations: AskCitation[]; workSlug: string | null }) {
  const { t, lang } = useT();
  const [focus, setFocus] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const sourcesRef = useRef<HTMLUListElement>(null);
  const works = [...new Map(citations.filter((c) => c.workSlug !== workSlug).map((c) => [c.workSlug, c.workName])).entries()];

  // İşaretten açılan kaynak kartın alt kenarında kalmasın.
  useEffect(() => {
    if (!shown) return;
    const target = focus === null ? sourcesRef.current : sourcesRef.current?.querySelector<HTMLElement>(`[data-source="${focus}"]`);
    target?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [shown, focus]);

  return (
    <div className={cn("flex flex-col gap-3", ENTER)}>
      <p className="leading-relaxed">
        {text.split(/(\[\d+\])/).map((part, i) => {
          const n = /^\[(\d+)\]$/.exec(part)?.[1];
          const citation = n ? citations.find((c) => c.index === Number(n)) : undefined;
          return citation ? (
            <button
              key={i}
              type="button"
              aria-label={t("ask.citation", { n: citation.index })}
              aria-expanded={shown && focus === citation.index}
              onClick={() => {
                setShown(true);
                setFocus(citation.index);
              }}
              className="rounded-sm px-0.5 font-bold text-link underline-offset-2 transition-colors hover:underline focus-visible:outline-2"
            >
              {part}
            </button>
          ) : (
            part
          );
        })}
      </p>
      {citations.length || works.length ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {citations.length ? (
            <button
              type="button"
              aria-expanded={shown}
              onClick={() => {
                setShown((v) => !v);
                setFocus(null);
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg font-semibold text-link transition-[scale] duration-150 ease-out active:scale-[0.97]"
            >
              <BookOpenIcon className="size-4" aria-hidden />
              {t("ask.sources", { n: citations.length })}
              <ChevronDownIcon className={cn("size-4 transition-transform duration-200 ease-out", shown && "rotate-180")} aria-hidden />
            </button>
          ) : null}
          {works.map(([slug, name]) => (
            <Link key={slug} href={href(lang, `/eser/${slug}`)} className="inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-3">
              {t("ask.workLink", { name })}
            </Link>
          ))}
        </div>
      ) : null}
      {shown ? (
        <ul ref={sourcesRef} className="flex flex-col gap-2">
          {citations.map((c, i) => (
            <li
              key={c.index}
              data-source={c.index}
              style={{ transitionDelay: `${i * 40}ms` }}
              className={cn(
                "flex flex-col gap-1 rounded-xl bg-secondary p-3 text-sm outline-offset-0 contrast:bg-background contrast:outline-2 contrast:outline-foreground",
                "transition-[opacity,translate,outline-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:-translate-y-1 starting:opacity-0",
                focus === c.index ? "outline-2 outline-ring" : "outline-2 outline-transparent",
              )}
            >
              <p className="font-semibold">
                [{c.index}] {c.workName}
              </p>
              {c.section === "summary" || c.section === "app" ? <p className="text-muted-foreground">{t(`ask.section.${c.section}`)}</p> : null}
              <p>{c.sourceTitle}</p>
              <p className="text-muted-foreground">
                {[c.sourcePublisher, c.sourceYear, c.sourceVolume ? t("ask.volume", { n: c.sourceVolume }) : null, c.sourcePage ? t("ask.page", { page: c.sourcePage }) : null]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {c.sourceUrl ? (
                <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center self-start font-semibold text-link underline underline-offset-3">
                  {t("ask.openSource")}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
