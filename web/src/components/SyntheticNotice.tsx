import { useI18n } from '../lib/useI18n'

/** Плашка о синтетических данных: правило проекта, видна на каждом экране. */
export function SyntheticNotice() {
  const { t } = useI18n()
  return (
    <p className="relative bg-smalt-deep px-6 py-3 text-center text-sm font-medium text-white">
      <span aria-hidden className="mr-2.5 inline-block size-2.5 bg-ochre align-middle" />
      {t.synthetic}
    </p>
  )
}
