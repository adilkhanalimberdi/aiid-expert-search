import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { CatalogTable } from '../components/CatalogTable'
import { ErrorBox } from '../components/ErrorBox'
import { HeroBand, PageTitle } from '../components/HeroBand'
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
      <div className="mx-auto max-w-[1120px] space-y-6 px-4 py-12 sm:px-6">
        <section className="border-2 border-ink bg-white p-5 sm:p-7" aria-label={t.data.current}>
          <h2 className="font-display text-3xl font-light tracking-[-0.03em]">{t.data.current}</h2>
          {health.isLoading && <Skeleton className="mt-4 h-6 w-64" />}
          {health.error && (
            <div className="mt-4">
              <ErrorBox message={health.error} />
            </div>
          )}
          {health.data && (
            <p className="mt-3 text-muted">
              {t.data.experts}: <strong className="tnum text-ink">{health.data.experts}</strong> · {t.data.model}{' '}
              {health.data.model}
              {industries.data && ` · ${t.data.industries}: ${industries.data.join(', ')}`}
            </p>
          )}
        </section>

        <section
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={drop}
          className={`flex flex-col items-center border-2 border-dashed p-10 text-center transition-colors ${
            isDragging ? 'border-cobalt bg-lime' : 'border-ink bg-white'
          }`}
          aria-label={t.data.upload}
        >
          <p className="font-display text-2xl font-light tracking-[-0.03em]">{t.data.dropTitle}</p>
          <p className="mt-2 text-sm text-muted">{t.data.dropHint}</p>
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
          <Button variant="ink" className="mt-6" onClick={() => fileInput.current?.click()} disabled={isUploading}>
            {isUploading ? t.data.uploading : t.data.upload}
          </Button>
        </section>

        {error && <ErrorBox message={error} />}

        {report && (
          <section className="border-2 border-ink bg-white p-5 sm:p-7" role="status">
            <h2 className="font-display text-3xl font-light tracking-[-0.03em]">{t.data.result}</h2>
            <p className="mt-3">
              {t.data.loaded}: <strong className="tnum text-cobalt-deep">{report.loaded}</strong> · {t.data.skipped}:{' '}
              <strong className="tnum">{report.skipped}</strong>
            </p>
            {report.errors.length > 0 && (
              <ul className="mt-3 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-muted">
                {report.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <CatalogTable reloadKey={reloadKey} />

        <section className="border-2 border-ink bg-white p-5 sm:p-7" aria-label={t.data.formatTitle}>
          <h2 className="font-display text-3xl font-light tracking-[-0.03em]">{t.data.formatTitle}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            {t.data.formatBody(REQUIRED_COLUMNS.map((column) => `“${column}”`).join(', '))}
          </p>
        </section>
      </div>
    </>
  )
}
