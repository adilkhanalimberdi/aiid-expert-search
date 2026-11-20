import type { ParsedQuery } from './api'
import type { Dict } from './i18n'

export type Kind = 'plain' | 'skill' | 'place' | 'condition' | 'excluded'
interface Piece {
  kind: Kind
  text: string
}

/** Шаблон может начинаться с запятой («, only available»): запятая остаётся обычным текстом, подсвечивается слово. */
function piece(kind: Kind, template: string, value = ''): Piece[] {
  const text = value ? template + value : template
  const comma = text.match(/^(, )(.*)$/)
  return comma ? [{ kind: 'plain', text: comma[1] }, { kind, text: comma[2] }] : [{ kind, text }]
}

/** Запрос, прочитанный движком, собирается в предложение из реальных полей разбора (город, отрасль, опыт, термины). */
export function readbackPieces(parsed: ParsedQuery, t: Dict): Piece[] {
  const r = t.readback
  const pieces: Piece[] = [{ kind: 'plain', text: r.lead }]
  if (parsed.terms.length === 0) pieces.push({ kind: 'plain', text: r.anExpert })
  parsed.terms.forEach((term, index) => {
    if (index > 0) pieces.push({ kind: 'plain', text: ', ' })
    pieces.push({ kind: 'skill', text: term })
  })
  if (parsed.city) pieces.push(...piece('plain', r.inCity), { kind: 'place', text: parsed.city })
  if (parsed.industry) pieces.push(...piece('plain', r.inIndustry), { kind: 'place', text: parsed.industry })
  if (parsed.min_experience !== null) pieces.push(...piece('condition', r.fromExperience(parsed.min_experience)))
  if (parsed.available_only) pieces.push(...piece('condition', r.availableOnly))
  // исключённое («не нужен GMP», «кроме Python») видно в предложении перечёркнутым: человек проверяет, что понято верно
  parsed.excluded_terms.forEach((term, index) => {
    pieces.push({ kind: 'plain', text: index === 0 ? r.except : ', ' }, { kind: 'excluded', text: term })
  })
  return pieces
}

