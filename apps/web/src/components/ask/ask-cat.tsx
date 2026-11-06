"use client";

import type { AskFailure, AskHistoryMessage, AskResponse } from "@sezi/shared";
import { askFailure, MASCOT } from "@sezi/shared";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useCallback, useEffect, useRef, useState } from "react";

import { Popover, PopoverContent } from "@/components/ui/popover";
import { useAppearance } from "@/lib/appearance";
import { askSezi } from "@/lib/ask";
import { useT } from "@/lib/i18n-client";

import { MascotPlayer } from "./mascot-player";

/** Soru kartı ilk açılışta yüklenir; kediyle birlikte her sayfaya gelmez. */
const AskPanel = dynamic(() => import("./ask-panel").then((m) => m.AskPanel), { ssr: false });

export type Turn = {
  id: number;
  question: string;
  status: "pending" | "done" | "failed";
  answer?: AskResponse;
  failure?: AskFailure;
};

const HINT_KEY = "sezi.web.cat.hint";
/** Kedi yalnız soru sorulabilecek sayfalarda: rota, hesap formları ve yoğun eser bento ızgarasında içeriği kapatmaz. */
const HIDDEN = /^\/(?:tr|en)\/(?:rota|hesap|eserler)(?:\/|$)/;
const WORK = /^\/(?:tr|en)\/eser\/([a-z0-9-]+)/;
/** Oturan kedinin karedeki yeri (288 x 224 hücrede): düğme yalnız kedinin üstünü kaplar. */
const HIT = { x: 68, y: 45, width: 140, height: 155 };
const [CELL_W, CELL_H] = MASCOT.cell;
/**
 * Boştayken oturduğu yerden sola en çok bu kadar yürür (CSS px); sağ alt köşeden uzaklaşmaz. Tasarım paketi
 * 144/64 öneriyor, köşede kalsın diye kısaltıldı (adım ~17/13 px: masaüstünde 3-4, telefonda 3 adım).
 */
const ROAM_PX = { desktop: 64, mobile: 40 };

/**
 * Sezi'ye Sor: sağ alt köşede oturan Van kedisi. Üstüne gelince sevilir, tıklayınca soru kartı açılır;
 * cevap aranırken kitabını karıştırır, kaynak bulunamazsa üzülür. Boştayken köşede birkaç adım dolaşır.
 */
export function AskCat() {
  const pathname = usePathname();
  const { cat } = useAppearance();
  if (!cat || HIDDEN.test(pathname)) return null;
  return <Cat workSlug={WORK.exec(pathname)?.[1] ?? null} />;
}

function Cat({ workSlug }: { workSlug: string | null }) {
  const { t, lang } = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);
  const player = useRef<MascotPlayer | null>(null);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const nextId = useRef(1);
  const pending = turns.some((x) => x.status === "pending");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wide = matchMedia("(min-width: 1200px)");
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round((canvas.clientWidth * CELL_H * dpr) / CELL_W);
    };
    size();
    const p = new MascotPlayer({
      canvas,
      base: "/maskot/",
      range: () => {
        const radius = wide.matches ? ROAM_PX.desktop : ROAM_PX.mobile;
        return Math.max(0, Math.min(radius, window.innerWidth - canvas.clientWidth - 16));
      },
      onMove: (offset) => {
        if (walkerRef.current) walkerRef.current.style.transform = `translateX(${-offset}px)`;
      },
    });
    player.current = p;
    const resize = new ResizeObserver(() => {
      size();
      p.relayout();
    });
    resize.observe(canvas);
    return () => {
      resize.disconnect();
      p.destroy();
      player.current = null;
    };
  }, []);

  // Kart açıkken ya da cevap beklenirken dolaşmaz; kart kedinin oturduğu yere bağlıdır.
  useEffect(() => {
    player.current?.setRoaming(!open && !pending);
  }, [open, pending]);

  // İlk ziyarette bir kez "Merak ettiğini sor".
  useEffect(() => {
    if (localStorage.getItem(HINT_KEY)) return;
    const show = window.setTimeout(() => setHint(true), 2500);
    const hide = window.setTimeout(() => {
      setHint(false);
      localStorage.setItem(HINT_KEY, "1");
    }, 9500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  const ask = useCallback(
    async (question: string, retryOf?: number) => {
      const q = question.trim();
      if (!q || turns.some((x) => x.status === "pending")) return;
      const history: AskHistoryMessage[] = [];
      for (const x of turns) {
        if (x.status !== "done" || x.id === retryOf || !x.answer) continue;
        history.push({ role: "user", text: x.question }, { role: "assistant", text: x.answer.answer });
      }
      const id = retryOf ?? nextId.current++;
      setTurns((list) => (retryOf ? list.map((x) => (x.id === id ? { id, question: q, status: "pending" } : x)) : [...list, { id, question: q, status: "pending" }]));
      player.current?.setSad(false);
      player.current?.setThinking(true);
      try {
        const answer = await askSezi(q, lang, workSlug ? [workSlug] : [], history);
        setTurns((list) => list.map((x) => (x.id === id ? { ...x, status: "done", answer } : x)));
        // Kaynak bulunamadıysa da kulaklar ve baş eğik kalır; yeni soru ya da sohbet sıfırlanınca kalkar.
        if (answer.mode === "insufficient") player.current?.setSad(true);
        player.current?.setThinking(false);
        if (answer.mode !== "insufficient") player.current?.petFor(2500);
      } catch (error) {
        setTurns((list) => list.map((x) => (x.id === id ? { ...x, status: "failed", failure: askFailure(error) } : x)));
        // Hata (bağlantı, sunucu, sınır): aynı bekleyiş.
        player.current?.setSad(true);
        player.current?.setThinking(false);
      }
    },
    [turns, lang, workSlug],
  );

  const toggle = (value: boolean) => {
    setOpen(value);
    if (value) {
      setHint(false);
      localStorage.setItem(HINT_KEY, "1");
      player.current?.preload(["kitap", "yanit_yok"]);
    }
  };

  return (
    <Popover open={open} onOpenChange={toggle}>
      {/* Sahne ekranın içinde kalır; dar ekranda alt gezinmenin üstündedir. */}
      <PopoverPrimitive.Anchor asChild>
        <div
          className="pointer-events-none fixed right-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom)-0.5rem)] z-40 w-[10.5rem] print:hidden min-[1200px]:bottom-0 min-[1200px]:w-[13.5rem]"
          style={{ aspectRatio: `${CELL_W} / ${CELL_H}` }}
        >
          {hint ? (
            <p
              aria-hidden
              className="absolute right-[42%] bottom-[78%] w-max max-w-48 rounded-2xl rounded-br-sm bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-md ring-1 ring-foreground/10 transition-[opacity,transform] duration-200 ease-out starting:translate-y-1 starting:opacity-0 contrast:shadow-none contrast:ring-2 contrast:ring-foreground"
            >
              {t("ask.hint")}
            </p>
          ) : null}
          <div ref={walkerRef} className="absolute inset-0 will-change-transform">
            <canvas ref={canvasRef} aria-hidden className="size-full" />
            <PopoverPrimitive.Trigger asChild>
              <button
                type="button"
                aria-label={t("ask.open")}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") player.current?.setHover("pointer", true);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") player.current?.setHover("pointer", false);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType !== "mouse") player.current?.petFor(4000);
                }}
                onFocus={(e) => {
                  if (e.currentTarget.matches(":focus-visible")) player.current?.setHover("focus", true);
                }}
                onBlur={() => player.current?.setHover("focus", false)}
                className="pointer-events-auto absolute rounded-[40%] outline-offset-0 focus-visible:outline-3 focus-visible:outline-ring"
                style={{
                  left: `${(HIT.x / CELL_W) * 100}%`,
                  top: `${(HIT.y / CELL_H) * 100}%`,
                  width: `${(HIT.width / CELL_W) * 100}%`,
                  height: `${(HIT.height / CELL_H) * 100}%`,
                }}
              />
            </PopoverPrimitive.Trigger>
          </div>
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={-12}
        alignOffset={8}
        collisionPadding={12}
        onOpenAutoFocus={(e) => {
          // Odak kartın soru kutusuna gider (AskPanel kendisi odaklar).
          e.preventDefault();
        }}
        // Kediden (köşeden) büyüyerek açılır: 200 ms açılış, kapanış daha kısa (150 ms).
        className="w-[min(27rem,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-[28px] bg-background p-0 text-base shadow-lg duration-200 data-closed:duration-150 contrast:shadow-none contrast:ring-2 contrast:ring-foreground"
      >
        <AskPanel
          turns={turns}
          workSlug={workSlug}
          onAsk={(q) => void ask(q)}
          onRetry={(turn) => void ask(turn.question, turn.id)}
          onReset={() => {
            setTurns([]);
            player.current?.setSad(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
