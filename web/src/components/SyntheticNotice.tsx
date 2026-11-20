import { useI18n } from '../lib/useI18n'

/** Плашка о синтетических данных: правило проекта, видна на каждом экране. */
export function SyntheticNotice() {
  const { t } = useI18n()
  return <p className="relative bg-lime px-6 py-3 text-center text-sm font-medium text-ink">{t.synthetic}</p>
}
