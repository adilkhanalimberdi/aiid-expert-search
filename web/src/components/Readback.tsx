import type { ParsedQuery } from '../lib/api'
import { readbackPieces, type Kind } from '../lib/readback'
import { useI18n } from '../lib/useI18n'

// Запрос, прочитанный движком, выложен плитками: каждый понятый элемент это тессера своего цвета.
const STYLE: Record<Kind, string> = {
  plain: '',
  skill: 'tile bg-turquoise px-[0.32em] py-[0.06em] text-white',
  place: 'tile bg-ochre px-[0.32em] py-[0.06em] text-grout',
  condition: 'tile bg-smalt px-[0.32em] py-[0.06em] text-white',
  excluded: 'bg-terracotta-soft px-[0.32em] py-[0.06em] text-terracotta line-through decoration-2',
}

const LEGEND: { kind: Kind; swatch: string }[] = [
  { kind: 'skill', swatch: 'bg-turquoise' },
  { kind: 'place', swatch: 'bg-ochre' },
  { kind: 'condition', swatch: 'bg-smalt' },
  { kind: 'excluded', swatch: 'bg-terracotta' },
]

export function Readback({ parsed, tookMs, count }: { parsed: ParsedQuery; tookMs: number; count: number }) {
  const { t } = useI18n()
  const pieces = readbackPieces(parsed, t)
  const labels: Record<Kind, string> = {
    plain: '',
    skill: t.readback.legendSkill,
    place: t.readback.legendPlace,
    condition: t.readback.legendCondition,
    excluded: t.readback.legendExcluded,
  }
  const present = new Set(pieces.map((item) => item.kind))
  return (
    <div>
      <p className="max-w-[1000px] font-display text-[24px] font-light leading-[1.6] tracking-[-0.02em] text-pretty sm:text-[34px] sm:leading-[1.55]">
        {pieces.map((item, index) => (
          <span key={index} className={`box-decoration-clone ${STYLE[item.kind]}`}>
            {item.text}
          </span>
        ))}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-grout pt-3 text-sm text-slate">
        {LEGEND.filter((item) => item.kind !== 'excluded' || present.has('excluded')).map((item) => (
          <span key={item.kind} className="inline-flex items-center gap-2">
            <span aria-hidden className={`size-3 ${item.swatch}`} />
            {labels[item.kind]}
          </span>
        ))}
        <span className="tnum ml-auto text-pebble">
          {t.results(count)} · {t.took(tookMs)}
        </span>
      </div>
    </div>
  )
}
