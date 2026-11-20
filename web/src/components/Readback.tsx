import type { ParsedQuery } from '../lib/api'
import { readbackPieces, type Kind } from '../lib/readback'
import { useI18n } from '../lib/useI18n'

const STYLE: Record<Kind, string> = {
  plain: '',
  skill: 'bg-lime px-[0.12em]',
  place: 'bg-ink px-[0.12em] text-white',
  condition: 'text-cobalt underline decoration-[3px] underline-offset-[0.12em]',
  excluded: 'text-quiet line-through decoration-[3px] decoration-danger',
}

export function Readback({ parsed, tookMs, count }: { parsed: ParsedQuery; tookMs: number; count: number }) {
  const { t } = useI18n()
  const pieces = readbackPieces(parsed, t)
  return (
    <div>
      <p className="max-w-[980px] font-display text-[28px] font-light leading-[1.25] tracking-[-0.035em] text-pretty sm:text-[44px] sm:leading-[1.22]">
        {pieces.map((item, index) => (
          <span key={index} className={`box-decoration-clone ${STYLE[item.kind]}`}>
            {item.text}
          </span>
        ))}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="size-4 border border-ink bg-lime" />
          {t.readback.legendSkill}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="size-4 bg-ink" />
          {t.readback.legendPlace}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-[3px] w-4 bg-cobalt" />
          {t.readback.legendCondition}
        </span>
        {parsed.excluded_terms.length > 0 && (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="text-quiet line-through decoration-2 decoration-danger">
              abc
            </span>
            {t.readback.legendExcluded}
          </span>
        )}
        <span className="ml-auto text-quiet">
          {t.results(count)} · {t.took(tookMs)}
        </span>
      </div>
    </div>
  )
}
