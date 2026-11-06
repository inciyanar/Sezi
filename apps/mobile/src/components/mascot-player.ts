import { MASCOT, MASCOT_PET_FRAME, MASCOT_SAD_HOLD, MASCOT_SAD_IN, MASCOT_SAD_OUT, mascotReversed, type MascotStep } from '@sezi/shared';

/** Mobilde oynayan hareketler; sıra, ızgara katmanlarının sırasıdır (`Mascot` bileşeni). */
export const MASCOT_SHEET_NAMES = ['oturma', 'sevilme', 'kitap', 'yanit_yok'] as const;
type Name = (typeof MASCOT_SHEET_NAMES)[number];
type Phase = 'loop' | 'intro' | 'outro' | 'return' | 'static' | 'sadIn' | 'sadHold' | 'sadOut';

const A = MASCOT.actions;

/**
 * Zamanlayıcı sürümlü maskot durum makinesi; geçişler web oynatıcısındakiyle aynıdır (dolaşma hariç).
 * `draw(sheet, frame)` gösterilecek ızgara katmanını ve kareyi bildirir; çağıran bunu paylaşılan değere yazar.
 * Hareket azaltmada hiçbir hareket oynamaz; o anki durum tek sabit pozla gösterilir.
 */
export class MascotPlayer {
  private name: Name = 'oturma';
  private phase: Phase = 'loop';
  private seq: readonly MascotStep[] = A.oturma.sequence;
  private cursor = 0;
  private current = 0;
  private thinking = false;
  private sad = false;
  private touchUntil = 0;
  private reduced = false;
  private started = false;
  /** Kare zamanlayıcısı: hareketin bir sonraki karesi. */
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** Sevilme süresi: bitince kedi (hareket azaltmada da) oturmaya döner. Kare zamanlayıcısından bağımsızdır. */
  private petTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly drawFrame: (sheet: number, frame: number) => void) {}

  setReduced(value: boolean) {
    this.reduced = value;
    this.started = true;
    if (value) this.staticPose();
    else this.settle();
  }

  /** Bileşen kalkarken: bütün zamanlayıcılar. */
  stop() {
    clearTimeout(this.timer);
    clearTimeout(this.petTimer);
  }

  setThinking(value: boolean) {
    this.thinking = value;
    if (!this.started) return;
    if (this.reduced) return this.staticPose();
    if (value) {
      if (this.name === 'oturma') this.begin('kitap', 'intro', A.kitap.intro);
      else if (this.name === 'sevilme' && this.phase !== 'outro') this.begin('sevilme', 'outro', A.sevilme.outro);
    } else if (this.name === 'kitap') {
      // Kitap açılırken cevap geldiyse açılış geri sarılır; döngüdeyse güvenli karede kapanır (`step`).
      if (this.phase === 'intro' && this.current < 5) this.begin('kitap', 'return', mascotReversed(this.current, 140));
      else if (this.phase === 'loop' && A.kitap.safeLoopFrames.includes(this.current)) this.begin('kitap', 'outro', A.kitap.outro);
    } else if (this.sad && this.name !== 'yanit_yok') {
      this.begin('yanit_yok', 'sadIn', MASCOT_SAD_IN);
    }
  }

  setSad(value: boolean) {
    if (this.sad === value) return;
    this.sad = value;
    if (!this.started) return;
    if (this.reduced) return this.staticPose();
    if (this.thinking || this.name === 'kitap') return; // kitap kapanınca `settle`
    if (value) this.begin('yanit_yok', 'sadIn', MASCOT_SAD_IN);
    else if (this.name === 'yanit_yok' && (this.phase === 'sadIn' || this.phase === 'sadHold')) this.begin('yanit_yok', 'sadOut', MASCOT_SAD_OUT);
  }

  petFor(ms: number) {
    this.touchUntil = Date.now() + ms;
    clearTimeout(this.petTimer);
    this.petTimer = setTimeout(() => {
      // Saat çözünürlüğü yüzünden zamanlayıcı süreden hemen önce düşebilir; süre burada kesin biter.
      this.touchUntil = 0;
      if (this.reduced) this.staticPose();
    }, ms);
    if (!this.started) return;
    if (this.reduced) return this.staticPose();
    if (!this.thinking && !this.sad && this.name === 'oturma') this.begin('sevilme', 'intro', A.sevilme.intro);
  }

  private wanted() {
    return Date.now() < this.touchUntil;
  }

  private draw(name: Name, frame: number) {
    this.current = frame;
    this.drawFrame(MASCOT_SHEET_NAMES.indexOf(name), frame);
  }

  private begin(name: Name, phase: Phase, seq: readonly MascotStep[]) {
    if (this.reduced) return this.staticPose();
    this.name = name;
    this.phase = phase;
    this.seq = seq;
    this.cursor = 0;
    this.play();
  }

  private play() {
    clearTimeout(this.timer);
    const [f, ms] = this.seq[this.cursor] ?? [0, 160];
    this.draw(this.name, f);
    this.timer = setTimeout(() => this.step(), ms);
  }

  private step() {
    if (this.name === 'kitap' && this.phase === 'loop' && !this.thinking && A.kitap.safeLoopFrames.includes(this.current)) {
      return this.begin('kitap', 'outro', A.kitap.outro);
    }
    if (this.name === 'sevilme' && this.phase === 'loop' && (!this.wanted() || this.thinking)) {
      return this.begin('sevilme', 'outro', A.sevilme.outro);
    }
    this.cursor++;
    if (this.cursor >= this.seq.length) this.finish();
    else this.play();
  }

  private finish() {
    switch (this.name) {
      case 'yanit_yok':
        if (this.phase === 'sadIn' || this.phase === 'sadHold') {
          return this.sad ? this.begin('yanit_yok', 'sadHold', MASCOT_SAD_HOLD) : this.begin('yanit_yok', 'sadOut', MASCOT_SAD_OUT);
        }
        return this.settle();
      case 'kitap':
        if (this.phase === 'intro' || this.phase === 'loop') {
          return this.thinking ? this.begin('kitap', 'loop', A.kitap.loop) : this.begin('kitap', 'outro', A.kitap.outro);
        }
        return this.settle();
      case 'sevilme':
        if (this.phase === 'intro' || this.phase === 'loop') {
          const keep = this.wanted() && !this.thinking;
          return this.begin('sevilme', keep ? 'loop' : 'outro', keep ? A.sevilme.loop : A.sevilme.outro);
        }
        return this.settle();
      case 'oturma':
        return this.settle();
    }
  }

  private settle() {
    if (this.thinking) return this.begin('kitap', 'intro', A.kitap.intro);
    if (this.sad) return this.begin('yanit_yok', 'sadIn', MASCOT_SAD_IN);
    if (this.wanted()) return this.begin('sevilme', 'intro', A.sevilme.intro);
    this.begin('oturma', 'loop', A.oturma.sequence);
  }

  /** Yalnız kare zamanlayıcısı durur; sevilme süresi sürer ki bitince oturmaya dönülsün. */
  private staticPose() {
    clearTimeout(this.timer);
    const name: Name = this.thinking ? 'kitap' : this.sad ? 'yanit_yok' : this.wanted() ? 'sevilme' : 'oturma';
    this.name = name;
    this.phase = 'static';
    this.draw(name, name === 'kitap' ? A.kitap.staticFrame : name === 'yanit_yok' ? A.yanit_yok.staticFrame : name === 'sevilme' ? MASCOT_PET_FRAME : 0);
  }
}
