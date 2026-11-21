import type { ReactNode } from 'react'
import type { ParsedQuery } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { Icon, type IconName } from './Icon'

type Kind = 'skill' | 'place' | 'condition' | 'excluded'

const TONE: Record<Kind, string> = {
  skill: 'text-brand',
  place: 'text-place',
  condition: 'text-cond',
  excluded: 'text-danger',
}

/** Как движок прочитал запрос: слова без плашек, роль показывает цветная иконка; исключённое зачёркнуто. */
export function Readback({ parsed, count, tookMs, children }: { parsed: ParsedQuery; count: number; tookMs: number; children?: ReactNode }) {
  const { t } = useI18n()
  const r = t.readback
  const tokens: { kind: Kind; text: string; hint: string; icon: IconName }[] = [
    ...parsed.terms.map((text) => ({ kind: 'skill' as const, text, hint: r.legendSkill, icon: 'skill' as const })),
    ...(parsed.city ? [{ kind: 'place' as const, text: parsed.city, hint: t.card.city, icon: 'pin' as const }] : []),
    ...(parsed.industry ? [{ kind: 'place' as const, text: parsed.industry, hint: t.card.industry, icon: 'industry' as const }] : []),
    ...(parsed.min_experience !== null
      ? [{ kind: 'condition' as const, text: r.experienceShort(parsed.min_experience), hint: r.legendCondition, icon: 'clock' as const }]
      : []),
    ...(parsed.available_only ? [{ kind: 'condition' as const, text: r.availableShort, hint: r.legendCondition, icon: 'available' as const }] : []),
    ...parsed.excluded_terms.map((text) => ({ kind: 'excluded' as const, text, hint: r.legendExcluded, icon: 'ban' as const })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      <span className="label mr-2 text-ink-3">{r.label}</span>
      {tokens.length === 0 && <span className="text-sm text-ink-2">{r.noTerms}</span>}
      <ul className="contents">
        {tokens.map((token, index) => (
          <li key={`${token.kind}-${token.text}-${index}`} className="inline-flex items-center gap-1.5 pr-2.5 text-[14px] text-ink" title={token.hint}>
            <Icon name={token.icon} size={14} className={TONE[token.kind]} />
            <span className="sr-only">{token.hint}: </span>
            <span className={token.kind === 'excluded' ? 'text-ink-3 line-through decoration-danger decoration-[1.5px]' : ''}>{token.text}</span>
          </li>
        ))}
      </ul>
      <span className="ml-auto flex items-center gap-3 pl-3">
        <span className="flex items-center gap-2 text-[13px] text-ink-3">
          {t.results(count)}
          <span aria-hidden className="h-3 w-px bg-line-strong" />
          <span className="flex items-center gap-1">
            <Icon name="clock" size={13} />
            {t.took(tookMs)}
          </span>
        </span>
        {children}
      </span>
    </div>
  )
}
