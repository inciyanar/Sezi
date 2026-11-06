import { z } from "zod";

import raw from "./mascot.json";

/**
 * Sezi maskotu (Van kedisi) kare verisi: hücre boyu, hareketlerin kare sıraları ve süreleri. `data/build_mascot.py`
 * tasarımcı paketinden üretir. Web şeritleri tek satır (`apps/web/public/maskot`), mobil ızgaralar
 * `MASCOT_GRID_COLUMNS` sütunludur (`apps/mobile/assets/maskot`): Android'de çok geniş doku sınırına takılmaz.
 */

const Step = z.tuple([z.number().int().nonnegative(), z.number().positive()]);
export type MascotStep = z.infer<typeof Step>;
const Steps = z.array(Step).min(1);
const Action = z.object({ strip: z.string(), sequence: Steps });
const Phased = Action.extend({ intro: Steps, loop: Steps, outro: Steps });
const Walk = Action.extend({ strideLogical: z.number().positive(), cycleMs: z.number().positive() });
const Mascot = z.object({
  cell: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  roaming: z.object({
    idleDelayMs: z.tuple([z.number(), z.number()]),
  }),
  actions: z.object({
    oturma: Action,
    sevilme: Phased,
    kitap: Phased.extend({ safeLoopFrames: z.array(z.number().int()), staticFrame: z.number().int() }),
    yanit_yok: Action.extend({ staticFrame: z.number().int() }),
    kalk_sag: Action,
    otur_sag: Action,
    yurume_sag: Walk,
    kalk_sol: Action,
    otur_sol: Action,
    yurume_sol: Walk,
  }),
});

export const MASCOT = Mascot.parse(raw);
export type MascotAction = keyof typeof MASCOT.actions;

/** Mobil ızgara şeritlerinde satır başına kare. */
export const MASCOT_GRID_COLUMNS = 6;

const A = MASCOT.actions;
const SAD_AT = A.yanit_yok.sequence.findIndex(([frame]) => frame === A.yanit_yok.staticFrame);
/** Hata bekleyişi: yanit_yok kulakların düştüğü kareye kadar oynar, orada bekler, kalkarken kalanını oynar. */
export const MASCOT_SAD_IN: MascotStep[] = A.yanit_yok.sequence.slice(0, SAD_AT + 1);
export const MASCOT_SAD_HOLD: MascotStep[] = [[A.yanit_yok.staticFrame, 60_000]];
export const MASCOT_SAD_OUT: MascotStep[] = A.yanit_yok.sequence.slice(SAD_AT + 1);
/** Sevilme durağan pozu (hareket azaltmada). */
export const MASCOT_PET_FRAME = 6;

/** `frame` karesinden ilk kareye geri sarma. */
export function mascotReversed(frame: number, ms = 80): MascotStep[] {
  return Array.from({ length: frame + 1 }, (_, i) => [frame - i, ms]);
}
