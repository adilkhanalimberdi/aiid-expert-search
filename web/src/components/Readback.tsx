import type { ReactNode } from 'react'
import type { ParsedQuery } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { Icon, type IconName } from './Icon'

type Kind = 'skill' | 'place' | 'condition' | 'excluded'

const TONE: Record<Kind, string> = {
  skill: 'bg-brand-tint text-brand-deep',
  place: 'bg-place-tint text-place',
  condition: 'bg-cond-tint text-cond',
  excluded: 'bg-danger-tint text-danger line-through decoration-[1.5px]',
}

/** Как движок прочитал запрос: каждое поле разбора своим цветом, исключённое зачёркнуто. */
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
      <span className="serif mr-1.5 text-base font-semibold italic text-ink-2">{r.label}</span>
      {tokens.length === 0 && <span className="text-sm text-ink-2">{r.noTerms}</span>}
      <ul className="contents">
        {tokens.map((token, index) => (
          <li key={`${token.kind}-${token.text}-${index}`} className={`inline-flex items-center gap-1.5 rounded-md border border-current/15 py-1 pl-2 pr-2.5 text-[13px] font-medium ${TONE[token.kind]}`}>
            <Icon name={token.icon} size={14} />
            <span className="sr-only">{token.hint}: </span>
            {token.text}
          </li>
        ))}
      </ul>
      <span className="ml-auto flex items-center gap-3 pl-3">
        <span className="mono flex items-center gap-2 text-xs text-ink-3">
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
