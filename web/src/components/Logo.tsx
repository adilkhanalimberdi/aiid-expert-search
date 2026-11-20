import { SarapMark } from './Mosaic'

/** Логотип AIID без изменений (файл предоставлен командой), обрезан по границам изображения. */
export function AiidLogo({ height = 44 }: { height?: number }) {
  return (
    <svg
      viewBox="30 19 200 131"
      height={height}
      width={(height * 200) / 131}
      role="img"
      aria-label="AIID: Alliance of Innovative and Industrial Development"
    >
      <image href="/brand/aiid-white.png" width="259" height="170" />
    </svg>
  )
}

/** Лого-лок «Sarap | AIID»: сервис как часть экосистемы альянса. */
export function Brand() {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <SarapMark size={30} label="Sarap" />
      <span className="font-display text-[22px] font-medium tracking-[-0.02em] text-white">Sarap</span>
      <span aria-hidden className="h-6 w-0.5 bg-white/35" />
      <AiidLogo height={28} />
    </div>
  )
}
