/**
 * Ana sayfa kenar süsü: sayfanın iki yanından içeri uzanan hatayi/rumi dalı. Renk zeminden bir ton koyu
 * (`text-muted`), yalnız içerik sütununun dışındaki boşlukta durur ve kaydırırken kıpırdamaz. Geniş ekranda
 * görünür; yüksek kontrastta ve baskıda gösterilmez. Süs olduğu için ekran okuyucudan gizli.
 */
export function SideVines() {
  return (
    <div aria-hidden className="side-vines pointer-events-none fixed inset-0 -z-10 hidden text-muted xl:block contrast:hidden print:hidden">
      <Vine className="absolute left-0 top-16 h-[calc(100dvh-4rem)]" />
      <Vine className="absolute right-0 top-16 h-[calc(100dvh-4rem)] -scale-x-100" />
    </div>
  );
}

/** Sol kenardan doğan dal: S kıvrımlı gövde, ucu kıvrık filizler, rumi yaprakları ve iki hatayi çiçeği. */
function Vine({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 200 900" preserveAspectRatio="xMinYMid meet" className={className} style={{ width: "var(--vine-w)" }}>
      <g fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round">
        {/* Gövde */}
        <path d="M0 30 C70 50 120 120 100 210 S30 330 70 420 S170 540 130 650 S40 800 0 870" />
        {/* Filizler gövdeden çıkar, uçları sarmal */}
        <path d="M104 159 C130 140 160 145 166 168 C171 188 150 196 142 184 C136 174 146 166 153 172" />
        <path d="M62 315 C35 315 18 295 26 276 C33 260 52 266 49 280 C47 289 37 288 37 281" />
        <path d="M130 528 C155 510 182 520 182 545 C182 563 162 566 158 552 C155 542 165 536 171 543" />
        {/* Çiçek sapları gövdeden çıkar */}
        <path d="M81 268 C105 262 122 248 130 226" strokeWidth={3} />
        <path d="M98 721 C70 716 50 700 44 676" strokeWidth={3} />
      </g>
      <g fill="currentColor">
        {/* Rumi yaprakları: dibi gövdede, ucu dışa */}
        <path d="M84 94 C70 70 56 62 36 58 C44 80 60 92 84 94 Z" />
        <path d="M95 468 C112 450 130 444 152 446 C140 466 120 474 95 468 Z" />
        <path d="M143 592 C120 600 108 618 104 640 C126 632 140 616 143 592 Z" />
        <path d="M65 775 C85 790 104 794 124 790 C108 772 88 768 65 775 Z" />
        {/* Hatayi çiçekleri: üç taç yaprak ve kadeh, sapın ucunda */}
        <path d="M130 226 C114 218 110 196 120 180 C126 196 128 210 130 226 Z" />
        <path d="M130 226 C122 208 124 186 130 172 C136 186 138 208 130 226 Z" />
        <path d="M130 226 C146 218 150 196 140 180 C134 196 132 210 130 226 Z" />
        <circle cx={130} cy={226} r={6} />
        <path d="M44 676 C28 668 24 646 34 630 C40 646 42 660 44 676 Z" />
        <path d="M44 676 C36 658 38 636 44 622 C50 636 52 658 44 676 Z" />
        <path d="M44 676 C60 668 64 646 54 630 C48 646 46 660 44 676 Z" />
        <circle cx={44} cy={676} r={6} />
      </g>
    </svg>
  );
}
