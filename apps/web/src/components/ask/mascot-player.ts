import { MASCOT, MASCOT_PET_FRAME, MASCOT_SAD_HOLD, MASCOT_SAD_IN, MASCOT_SAD_OUT, mascotReversed, type MascotAction, type MascotStep } from "@sezi/shared";

/**
 * Sezi maskotu oynatıcısı: tasarımcı paketindeki `sezi-book.js` + `sezi-roam.js` davranışının tipli karşılığı.
 * Kareler `public/maskot/<şerit>.webp` içinde tek satır (288 x 224 hücre); `data/build_mascot.py` üretir.
 *
 * Hareketler: oturma (bekleme), sevilme (fare üstünde / dokununca), kitap (cevap aranırken; yalnız güvenli
 * karelerde kapanır), yanit_yok (kaynak bulunamadı, bir kez), kalk/yurume/otur (boştayken sola-sağa dolaşma).
 * Hareket azaltmada hiçbiri oynamaz; aynı durumlar sabit pozla gösterilir.
 */

type Step = MascotStep;
const A = MASCOT.actions;
const [CELL_W, CELL_H] = MASCOT.cell;

type Name = MascotAction;
type Dir = "sag" | "sol";
type Phase = "loop" | "intro" | "outro" | "return" | "stand" | "walk" | "sit" | "static" | "sadIn" | "sadHold" | "sadOut";
interface Trip {
  dir: Dir;
  cycles: number;
  completed: number;
  start: number;
  stride: number;
  stop: boolean;
}

const POSTER = "poz";
const WALK_STRIPS = ["kalk_sag", "yurume_sag", "kalk_sol", "yurume_sol"];
const moving = (name: Name) => name.startsWith("kalk_") || name.startsWith("yurume_") || name.startsWith("otur_");

export interface MascotOptions {
  canvas: HTMLCanvasElement;
  /** Şeritlerin kök yolu, ör. `/maskot/`. */
  base: string;
  /** Oturduğu yerden sola açılabileceği en uzun yol (CSS px). */
  range: () => number;
  /** Sola kayma (CSS px); çağıran sahneyi taşır. */
  onMove: (offsetCss: number) => void;
}

export class MascotPlayer {
  private name: Name = "oturma";
  private phase: Phase = "loop";
  private seq: readonly Step[] = A.oturma.sequence;
  private cursor = 0;
  private elapsed = 0;
  private clock = 0;
  private frame = 0;
  private thinking = false;
  /** Cevap verilemedi (kaynak yok, bağlantı, sunucu, sınır): yeni soru ya da sohbet sıfırlanana kadar kulaklar ve baş eğik. */
  private sad = false;
  private owners = new Set<string>();
  private touchUntil = 0;
  private trip: Trip | null = null;
  private pendingMove: Omit<Trip, "completed" | "start" | "stop"> | null = null;
  private offset = 0;
  private nextWalk = 0;
  private roaming = false;
  private started = false;
  private destroyed = false;
  private raf = 0;
  private last = 0;
  private timers = new Set<number>();
  private images = new Map<string, HTMLImageElement>();
  /** Şerit başına tek istek; sonuç (indi mi) saklanır. İnmeyen şerit bağlantı dönene kadar yeniden istenmez. */
  private loading = new Map<string, Promise<boolean>>();
  private failed = new Set<string>();
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");

  constructor(private readonly o: MascotOptions) {
    this.reduced.addEventListener("change", this.onMotionChange);
    window.addEventListener("online", this.onOnline);
    void this.load(POSTER).then((ok) => {
      if (ok) this.draw(0);
    });
    this.boot();
    this.raf = requestAnimationFrame(this.tick);
  }

  /** Oturma şeridi inince hareket başlar; inmezse kedi posterde durur (bağlantı dönünce yeniden denenir). */
  private boot() {
    void this.load(A.oturma.strip).then((ok) => {
      if (!ok || this.destroyed || this.started) return;
      this.started = true;
      this.schedule();
      if (this.reduced.matches) this.staticPose();
      else this.settle();
      // Kitap ve üzgün poz bağlantı koparsa da gösterilebilsin diye kısa süre sonra arka planda iner.
      this.later(1500, () => this.preload(["kitap", "yanit_yok", "sevilme"]));
    });
  }

  /** Cevap aranıyor: kitabı açar, cevap gelene kadar sayfa karıştırır. */
  setThinking(value: boolean) {
    this.thinking = value;
    if (value) {
      this.pendingMove = null;
      if (moving(this.name)) this.requestStop();
    }
    if (!this.started) return;
    if (this.reduced.matches) return this.staticPose();
    if (value) {
      if (this.name === "oturma") this.begin("kitap", "intro", A.kitap.intro);
      else if (this.name === "sevilme" && this.phase !== "outro") this.begin("sevilme", "outro", A.sevilme.outro);
    } else if (this.name === "kitap") {
      // Kitap açılırken cevap geldiyse açılış geri sarılır; döngüdeyse güvenli karede kapanır (`advance`).
      if (this.phase === "intro" && this.frame < 5) this.begin("kitap", "return", mascotReversed(this.frame, 140));
      else if (this.phase === "loop" && A.kitap.safeLoopFrames.includes(this.frame)) this.begin("kitap", "outro", A.kitap.outro);
    } else if (this.sad && !moving(this.name) && this.name !== "yanit_yok") {
      // Kitap şeridi inmediyse kedi oturuyordu; üzgün poza hemen geçer.
      this.begin("yanit_yok", "sadIn", MASCOT_SAD_IN);
    }
  }

  /** Bekleyiş: açılınca kulaklar ve baş düşer, öyle kalır; kapanınca kedi doğrulup oturur. Sevilmez, dolaşmaz. */
  setSad(value: boolean) {
    if (this.sad === value) return;
    this.sad = value;
    if (value) {
      this.pendingMove = null;
      if (moving(this.name)) this.requestStop();
    }
    if (!this.started) return;
    if (this.reduced.matches) return this.staticPose();
    if (this.thinking || this.name === "kitap" || moving(this.name)) return; // kitap kapanınca / oturunca `settle`
    if (value) this.begin("yanit_yok", "sadIn", MASCOT_SAD_IN);
    else if (this.name === "yanit_yok" && (this.phase === "sadIn" || this.phase === "sadHold")) this.begin("yanit_yok", "sadOut", MASCOT_SAD_OUT);
  }

  /** Fare üstünde ya da klavye odağında sevilir; `owner` aynı anda birden çok kaynağı ayırır. */
  setHover(owner: string, value: boolean) {
    const was = this.wanted();
    if (value) this.owners.add(owner);
    else this.owners.delete(owner);
    if (value) void this.load(A.sevilme.strip);
    if (!this.started) return;
    if (this.reduced.matches) return this.staticPose();
    if (value && moving(this.name) && !this.thinking) {
      this.pendingMove = null;
      this.touchUntil = Math.max(this.touchUntil, this.clock + 4000);
      this.requestStop();
    }
    if (this.thinking || this.sad || this.name === "kitap" || this.name === "yanit_yok") return;
    const is = this.wanted();
    if (is && !was && this.name === "oturma") this.begin("sevilme", "intro", A.sevilme.intro);
    else if (!is && this.name === "sevilme" && this.phase === "loop") this.begin("sevilme", "outro", A.sevilme.outro);
  }

  /** Dokunma ya da güzel bir cevap: bir süre mutlu. */
  petFor(ms: number) {
    void this.load(A.sevilme.strip);
    this.touchUntil = this.clock + ms;
    this.later(ms, () => {
      this.touchUntil = this.clock;
      if (this.reduced.matches) this.staticPose();
    });
    if (!this.started) return;
    if (this.reduced.matches) return this.staticPose();
    if (moving(this.name) && !this.thinking) {
      this.pendingMove = null;
      this.requestStop();
    } else if (!this.thinking && this.name === "oturma") this.begin("sevilme", "intro", A.sevilme.intro);
  }

  /** Boştayken kendi başına dolaşma. Kapatılınca yürüyen kedi adımını bitirip oturur. */
  setRoaming(value: boolean) {
    this.roaming = value;
    if (value) {
      this.schedule();
      WALK_STRIPS.forEach((s) => void this.load(s));
    } else {
      this.pendingMove = null;
      if (moving(this.name)) this.requestStop();
    }
  }

  preload(strips: readonly Name[]) {
    strips.forEach((name) => void this.load(A[name].strip));
  }

  /** Pencere boyu değişince dolaşma alanı daralabilir. */
  relayout() {
    this.offset = Math.max(0, Math.min(this.o.range(), this.offset));
    this.o.onMove(this.offset);
    this.draw(this.frame);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.timers.forEach(clearTimeout);
    this.reduced.removeEventListener("change", this.onMotionChange);
    window.removeEventListener("online", this.onOnline);
  }

  // ---------- İç işleyiş ----------

  private load(strip: string): Promise<boolean> {
    const known = this.loading.get(strip);
    if (known) return known;
    const image = new Image();
    image.src = `${this.o.base}${strip}.webp`;
    const job = image.decode().then(
      () => {
        this.images.set(strip, image);
        return true;
      },
      // Şerit inmezse (404, ağ) kedi o hareketi yapmaz, bulunduğu pozda kalır; bağlantı dönene kadar istenmez.
      () => {
        this.failed.add(strip);
        return false;
      },
    );
    this.loading.set(strip, job);
    return job;
  }

  private later(ms: number, fn: () => void) {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (!this.destroyed) fn();
    }, ms);
    this.timers.add(id);
  }

  private wanted() {
    return this.owners.size > 0 || this.clock < this.touchUntil;
  }

  private schedule() {
    const [a, b] = MASCOT.roaming.idleDelayMs;
    this.nextWalk = this.clock + a + Math.random() * (b - a);
  }

  private draw(frame: number) {
    this.frame = frame;
    const { canvas } = this.o;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sheet = this.images.get(A[this.name].strip);
    const image = sheet ?? this.images.get(POSTER);
    if (!image) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Piksel çizim: büyütürken keskin, küçültürken yumuşak.
    ctx.imageSmoothingEnabled = canvas.width < CELL_W;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, sheet ? frame * CELL_W : 0, 0, CELL_W, CELL_H, 0, 0, canvas.width, canvas.height);
  }

  /** Şerit henüz inmediyse oturmaya döner; inince yeniden karar verilir. */
  private begin(name: Name, phase: Phase, seq: readonly Step[]) {
    if (this.reduced.matches) return this.staticPose();
    const strip = A[name].strip;
    if (!this.images.has(strip)) {
      void this.load(strip).then((ok) => {
        if (ok && this.name === "oturma" && !this.destroyed) this.settle();
      });
      if (name === "oturma") return;
      name = "oturma";
      phase = "loop";
      seq = A.oturma.sequence;
    }
    const previous = this.name;
    this.name = name;
    this.phase = phase;
    this.seq = seq;
    this.cursor = 0;
    this.elapsed = 0;
    this.draw(seq[0]![0]);
    if (name === "oturma" && previous !== "oturma") this.schedule();
  }

  private staticPose() {
    this.trip = null;
    this.pendingMove = null;
    let name: Name = this.thinking ? "kitap" : this.sad ? "yanit_yok" : this.wanted() ? "sevilme" : "oturma";
    if (!this.images.has(A[name].strip)) {
      void this.load(A[name].strip).then((ok) => {
        if (ok && this.reduced.matches && !this.destroyed) this.staticPose();
      });
      name = "oturma";
    }
    this.name = name;
    this.phase = "static";
    this.cursor = 0;
    this.elapsed = 0;
    this.draw(name === "kitap" ? A.kitap.staticFrame : name === "yanit_yok" ? A.yanit_yok.staticFrame : name === "sevilme" ? MASCOT_PET_FRAME : 0);
  }

  private settle() {
    if (this.thinking) return this.begin("kitap", "intro", A.kitap.intro);
    if (this.sad) return this.begin("yanit_yok", "sadIn", MASCOT_SAD_IN);
    if (this.wanted()) {
      this.pendingMove = null;
      return this.begin("sevilme", "intro", A.sevilme.intro);
    }
    const p = this.pendingMove;
    if (p && !this.reduced.matches) {
      this.pendingMove = null;
      const room = p.dir === "sol" ? this.o.range() - this.offset : this.offset;
      const capacity = Math.floor((room + 0.001) / p.stride);
      if (capacity > 0) {
        this.trip = { ...p, cycles: Math.min(capacity, p.cycles), completed: 0, start: this.offset, stop: false };
        return this.begin(p.dir === "sol" ? "kalk_sol" : "kalk_sag", "stand", A[p.dir === "sol" ? "kalk_sol" : "kalk_sag"].sequence);
      }
    }
    this.begin("oturma", "loop", A.oturma.sequence);
  }

  private walk(dir: Dir) {
    if (this.reduced.matches || this.thinking || this.sad || this.wanted() || this.name === "yanit_yok") return false;
    const action = A[dir === "sol" ? "yurume_sol" : "yurume_sag"];
    if (!WALK_STRIPS.every((s) => this.images.has(s))) return false;
    const stride = action.strideLogical * (this.o.canvas.clientWidth / CELL_W);
    const room = dir === "sol" ? this.o.range() - this.offset : this.offset;
    const capacity = Math.floor((room + 0.001) / stride);
    if (capacity < 1) return false;
    this.pendingMove = { dir, cycles: Math.min(capacity, 4 + Math.floor(Math.random() * 4)), stride };
    if (this.name === "oturma") this.settle();
    return true;
  }

  private requestStop() {
    if (!this.trip) return;
    this.trip.stop = true;
    if (this.name.startsWith("kalk_") && this.phase !== "return") this.begin(this.name, "return", mascotReversed(this.frame));
  }

  private finish() {
    const name = this.name;
    if (name === "yanit_yok") {
      if (this.phase === "sadIn" || this.phase === "sadHold") {
        return this.sad ? this.begin("yanit_yok", "sadHold", MASCOT_SAD_HOLD) : this.begin("yanit_yok", "sadOut", MASCOT_SAD_OUT);
      }
      return this.settle();
    }
    if (name === "oturma") return this.settle();
    if (name === "kitap") {
      if (this.phase === "intro" || this.phase === "loop") {
        return this.thinking ? this.begin("kitap", "loop", A.kitap.loop) : this.begin("kitap", "outro", A.kitap.outro);
      }
      return this.settle();
    }
    if (name === "sevilme") {
      if (this.phase === "intro" || this.phase === "loop") {
        const keep = this.wanted() && !this.thinking;
        return this.begin("sevilme", keep ? "loop" : "outro", keep ? A.sevilme.loop : A.sevilme.outro);
      }
      return this.settle();
    }
    const trip = this.trip;
    if (!trip) return this.settle();
    if (name.startsWith("kalk_")) {
      if (this.phase === "return") {
        this.trip = null;
        return this.settle();
      }
      const walkName = trip.dir === "sol" ? "yurume_sol" : "yurume_sag";
      return this.begin(walkName, "walk", A[walkName].sequence);
    }
    if (name.startsWith("yurume_")) {
      trip.completed++;
      this.offset = trip.start + (trip.dir === "sol" ? 1 : -1) * trip.stride * trip.completed;
      this.o.onMove(this.offset);
      if (trip.stop || trip.completed >= trip.cycles || this.thinking || this.wanted()) {
        const sit = trip.dir === "sol" ? "otur_sol" : "otur_sag";
        return this.begin(sit, "sit", A[sit].sequence);
      }
      return this.begin(name, "walk", A[name].sequence);
    }
    this.trip = null;
    this.settle();
  }

  private advance(dt: number) {
    this.clock += dt;
    this.elapsed += dt;
    let guard = 0;
    while (this.elapsed >= this.seq[this.cursor]![1] && guard++ < 20) {
      const carry = this.elapsed - this.seq[this.cursor]![1];
      if (this.name === "kitap" && this.phase === "loop" && !this.thinking && A.kitap.safeLoopFrames.includes(this.frame)) {
        this.begin("kitap", "outro", A.kitap.outro);
      } else {
        this.cursor++;
        if (this.cursor >= this.seq.length) this.finish();
        else this.draw(this.seq[this.cursor]![0]);
      }
      this.elapsed = carry;
    }
    if (this.name === "sevilme" && this.phase === "loop" && (!this.wanted() || this.thinking)) this.begin("sevilme", "outro", A.sevilme.outro);
    if (this.trip && this.name.startsWith("yurume_")) {
      const action = A[this.trip.dir === "sol" ? "yurume_sol" : "yurume_sag"];
      const within = this.seq.slice(0, this.cursor).reduce((n, [, ms]) => n + ms, 0) + this.elapsed;
      this.offset = this.trip.start + (this.trip.dir === "sol" ? 1 : -1) * this.trip.stride * (this.trip.completed + within / action.cycleMs);
      this.o.onMove(this.offset);
    }
    if (this.roaming && this.name === "oturma" && this.clock >= this.nextWalk) {
      if (!this.walk(this.offset > this.o.range() / 2 ? "sag" : "sol")) this.schedule();
    }
  }

  private tick = (now: number) => {
    if (this.destroyed) return;
    const dt = this.last ? Math.min(100, now - this.last) : 0;
    this.last = now;
    if (this.started && !this.reduced.matches && !document.hidden && this.phase !== "static") this.advance(dt);
    this.raf = requestAnimationFrame(this.tick);
  };

  private onMotionChange = () => {
    if (!this.started) return;
    if (this.reduced.matches) this.staticPose();
    else this.settle();
  };

  /** Bağlantı dönünce inmemiş şeritler yeniden istenir; kedi oturuyorsa beklenen poza geçer. */
  private onOnline = () => {
    const retry = [...this.failed];
    this.failed.clear();
    retry.forEach((s) => this.loading.delete(s));
    if (!this.started) return this.boot();
    for (const s of retry) {
      void this.load(s).then((ok) => {
        if (ok && this.name === "oturma" && !this.destroyed) this.settle();
      });
    }
  };
}
