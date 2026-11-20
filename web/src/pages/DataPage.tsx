import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { CatalogTable } from '../components/CatalogTable'
import { ErrorBox } from '../components/ErrorBox'
import { HeroBand, PageTitle } from '../components/HeroBand'
import { Section } from '../components/Section'
import { Skeleton } from '../components/Skeleton'
import { Button } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { api, type UploadResponse } from '../lib/api'
import { useI18n } from '../lib/useI18n'

const REQUIRED_COLUMNS = ['id', 'full_name', 'position', 'industry', 'competencies', 'city', 'experience_years', 'availability']

export function DataPage({ nav }: { nav: ReactNode }) {
  const { t } = useI18n()
  const [reloadKey, setReloadKey] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [report, setReport] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const health = useAsync(() => api.health(), [reloadKey])
  const industries = useAsync(() => api.industries(), [reloadKey])

  async function upload(file: File | undefined) {
    if (!file) return
    setIsUploading(true)
    setError(null)
    setReport(null)
    try {
      setReport(await api.upload(file))
      setReloadKey((value) => value + 1)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsUploading(false)
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    setIsDragging(false)
    void upload(event.dataTransfer.files[0])
  }

  return (
    <>
      <HeroBand nav={nav}>
        <PageTitle>{t.data.title}</PageTitle>
      </HeroBand>
      <div className="mx-auto max-w-[1120px] space-y-[72px] px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
          <Section id="current-title" title={t.data.current}>
            {health.isLoading && <Skeleton className="mt-5 h-24 w-56" />}
            {health.error && (
              <div className="mt-5">
                <ErrorBox message={health.error} />
              </div>
            )}
            {health.data && (
              <div className="pt-6">
                <p className="tnum font-display text-[76px] font-light leading-[0.9] tracking-[-0.04em] text-smalt sm:text-[96px]">
                  {health.data.experts}
                </p>
                <p className="mt-3 text-[15px] font-medium">{t.data.experts}</p>
                {industries.data && (
                  <p className="mt-6 border-t border-seam pt-4 text-[15px] leading-relaxed text-slate">
                    <span className="inline-block font-medium text-grout first-letter:uppercase">{t.data.industries}:</span> {industries.data.join(', ')}
                  </p>
                )}
                <p className="mt-3 border-t border-seam pt-4 text-sm text-pebble first-letter:uppercase">
                  {t.data.model} {health.data.model}
                </p>
              </div>
            )}
          </Section>

          <section
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={drop}
            className={`flex min-h-72 flex-col items-center justify-center border-2 border-dashed p-8 text-center transition-colors sm:p-10 ${
              isDragging ? 'border-turquoise bg-turquoise/10' : 'border-grout/40 bg-plaster'
            }`}
            aria-label={t.data.upload}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden className="text-turquoise">
              <path d="M12 16V4M7 9l5-5 5 5M4 15v5h16v-5" />
            </svg>
            <p className="mt-5 font-display text-[22px] font-light leading-tight tracking-[-0.02em] sm:text-[26px]">{t.data.dropTitle}</p>
            <p className="mt-2 max-w-[44ch] text-sm text-slate">{t.data.dropHint}</p>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label={t.data.chooseFile}
              onChange={(event) => {
                void upload(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <Button variant="primary" className="mt-7" onClick={() => fileInput.current?.click()} disabled={isUploading}>
              {isUploading ? t.data.uploading : t.data.upload}
            </Button>
          </section>
        </div>

        {error && <ErrorBox message={error} />}

        {report && (
          <div role="status">
            <Section id="report-title" title={t.data.result}>
              <p className="pt-5 text-[17px]">
                {t.data.loaded}: <strong className="tnum font-semibold text-turquoise-deep">{report.loaded}</strong> ·{' '}
                {t.data.skipped}: <strong className="tnum font-semibold">{report.skipped}</strong>
              </p>
              {report.errors.length > 0 && (
                <ul className="mt-3 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-slate">
                  {report.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}

        <CatalogTable reloadKey={reloadKey} />

        <Section id="format-title" title={t.data.formatTitle}>
          <ul className="flex flex-wrap gap-2 pt-5">
            {REQUIRED_COLUMNS.map((column) => (
              <li key={column} className="tile bg-grout px-3 py-1.5 text-sm font-medium text-white">
                {column}
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-[75ch] text-[15px] leading-relaxed text-slate">
            {t.data.formatBody(REQUIRED_COLUMNS.map((column) => `“${column}”`).join(', '))}
          </p>
        </Section>
      </div>
    </>
  )
}
