import { useRef, useState, type DragEvent } from 'react'
import { CatalogTable } from '../components/CatalogTable'
import { ErrorBox } from '../components/ErrorBox'
import { PageHeader } from '../components/Shell'
import { Button, Eyebrow, Panel, Skeleton } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { api, type UploadResponse } from '../lib/api'
import { useI18n } from '../lib/useI18n'

const REQUIRED_COLUMNS = ['id', 'full_name', 'position', 'industry', 'competencies', 'city', 'experience_years', 'availability']

export function DataPage() {
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
    <div className="pb-8">
      <PageHeader title={t.data.title} subtitle={t.data.subtitle} />
      <div className="space-y-5 px-4 pt-4 sm:px-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <Panel className="p-5 sm:p-6" aria-labelledby="current-title">
            <Eyebrow id="current-title">{t.data.current}</Eyebrow>
            {health.isLoading && <Skeleton className="mt-4 h-28 w-full" />}
            {health.error && (
              <div className="mt-4">
                <ErrorBox message={health.error} />
              </div>
            )}
            {health.data && (
              <>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-sunken p-4">
                    <dd className="tnum text-[40px] font-extrabold leading-none tracking-[-0.04em] text-brand-deep">{health.data.experts}</dd>
                    <dt className="mt-2 text-sm font-medium text-ink-2">{t.data.experts}</dt>
                  </div>
                  <div className="rounded-lg bg-sunken p-4">
                    <dd className="tnum text-[40px] font-extrabold leading-none tracking-[-0.04em] text-ink">{industries.data?.length ?? '—'}</dd>
                    <dt className="mt-2 text-sm font-medium text-ink-2">{t.data.industries}</dt>
                  </div>
                </dl>
                {industries.data && (
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {industries.data.map((item) => (
                      <li key={item} className="rounded-md bg-place-tint px-2.5 py-1 text-[13px] font-semibold text-place">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 border-t border-line pt-3 text-sm text-ink-3">
                  {t.data.model}: <span className="font-semibold text-ink-2">{health.data.model}</span>
                </p>
              </>
            )}
          </Panel>

          <section
            aria-label={t.data.upload}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={drop}
            className={`flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:p-8 ${
              isDragging ? 'border-brand bg-brand-tint' : 'border-line-strong bg-surface'
            }`}
          >
            <span className="grid size-14 place-items-center rounded-xl bg-brand-tint text-brand-deep">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
              </svg>
            </span>
            <p className="mt-4 text-xl font-extrabold tracking-[-0.02em]">{t.data.dropTitle}</p>
            <p className="mt-1.5 max-w-[46ch] text-sm text-ink-2">{t.data.dropHint}</p>
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
            <Button variant="primary" className="mt-5" onClick={() => fileInput.current?.click()} disabled={isUploading}>
              {isUploading ? t.data.uploading : t.data.upload}
            </Button>
          </section>
        </div>

        {error && <ErrorBox message={error} />}

        {report && (
          <Panel role="status" className="p-5 sm:p-6" aria-labelledby="report-title">
            <Eyebrow id="report-title">{t.data.result}</Eyebrow>
            <p className="tnum mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
              <span>
                {t.data.loaded}: <strong className="text-lg font-extrabold text-free">{report.loaded}</strong>
              </span>
              <span>
                {t.data.skipped}: <strong className="text-lg font-extrabold">{report.skipped}</strong>
              </span>
            </p>
            {report.errors.length > 0 && (
              <ul className="mt-3 max-h-48 list-disc space-y-1 overflow-y-auto rounded-lg bg-sunken py-3 pl-8 pr-3 text-sm text-ink-2">
                {report.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <CatalogTable reloadKey={reloadKey} />

        <Panel className="p-5 sm:p-6" aria-labelledby="format-title">
          <Eyebrow id="format-title">{t.data.formatTitle}</Eyebrow>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {REQUIRED_COLUMNS.map((column) => (
              <li key={column} className="rounded-md bg-night px-2.5 py-1 font-mono text-[13px] text-white">
                {column}
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-[80ch] text-[15px] leading-relaxed text-ink-2">
            {t.data.formatBody(REQUIRED_COLUMNS.map((column) => `“${column}”`).join(', '))}
          </p>
        </Panel>
      </div>
    </div>
  )
}
