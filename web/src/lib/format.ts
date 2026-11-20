export function initials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/** Цвет оценки: от 70 сильное, от 40 среднее, ниже слабое (26% не должно выглядеть как успех). */
export type Strength = 'strong' | 'medium' | 'weak'

export function strengthOf(percent: number): Strength {
  if (percent >= 70) return 'strong'
  if (percent >= 40) return 'medium'
  return 'weak'
}
