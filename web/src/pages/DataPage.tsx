import { useRef, useState, type DragEvent } from 'react'
import { CatalogTable } from '../components/CatalogTable'
import { ErrorBox } from '../components/ErrorBox'
import { Icon } from '../components/Icon'
import { CONTAINER, PageHeader } from '../components/Shell'
import { Button, PanelTitle, Panel, Skeleton } from '../components/ui'
import { useAsync, type AsyncState } from '../hooks/useAsync'
import { api, type Health, type UploadResponse } from '../lib/api'
import { useI18n } from '../lib/useI18n'

const REQUIRED_COLUMNS = ['id', 'full_name', 'position', 'industry', 'competencies', 'city', 'experience_years', 'availability']

interface DataPageProps {
  isActive: boolean
  health: AsyncState<Health>
  catalogVersion: number
  onUploaded: () => void
}

export function DataPage({ isActive, health, catalogVersion, onUploaded }: DataPageProps) {
  const [hasOpened, setHasOpened] = useState(isActive)
  // раздел не грузит каталог, пока его ни разу не открыли: на старте сервер отвечает только поиску
  if (isActive && !hasOpened) setHasOpened(true)
  return hasOpened ? <DataContent health={health} catalogVersion={catalogVersion} onUploaded={onUploaded} /> : null
}

function DataContent({ health, catalogVersion, onUploaded }: Omit<DataPageProps, 'isActive'>) {
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [report, setReport] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const industries = useAsync((signal) => api.industries(signal), [catalogVersion])

  async function upload(file: File | undefined) {
    if (!file) return
    setIsUploading(true)
    setError(null)
    setReport(null)
    try {
      setReport(await api.upload(file))
      onUploaded()
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
    <div className={CONTAINER}>
      <PageHeader title={t.data.title} subtitle={t.data.subtitle} />
      <div className="space-y-5 pb-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Panel className="p-5 sm:p-6" aria-labelledby="current-title">
            <PanelTitle id="current-title">{t.data.current}</PanelTitle>
            {health.isLoading && !health.data && <Skeleton className="mt-4 h-28 w-full" />}
            {health.error && (
              <div className="mt-4">
                <ErrorBox message={health.error} />
              </div>
            )}
            {health.data && (
              <>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-sunken p-4">
                    <dd className="display tnum text-[44px] font-semibold leading-none text-ink">{health.data.experts}</dd>
                    <dt className="mt-2 text-sm text-ink-3">{t.search.expertsWord(health.data.experts)}</dt>
                  </div>
                  <div className="rounded-lg bg-sunken p-4">
                    <dd className="display tnum text-[44px] font-semibold leading-none text-ink">{industries.data?.length ?? '—'}</dd>
                    <dt className="mt-2 text-sm text-ink-3">{t.search.industriesWord(industries.data?.length ?? 0)}</dt>
                  </div>
                </dl>
                {industries.data && (
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {industries.data.map((item) => (
                      <li key={item} className="rounded bg-sunken px-2 py-0.5 text-[13px] text-ink-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
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
            className={`relative flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors sm:p-8 ${
              isDragging ? 'border-ink-2 bg-raised' : 'border-line-strong bg-surface'
            }`}
          >
            <span className="grid size-12 place-items-center rounded-full bg-hover text-ink-2">
              <Icon name="upload" size={24} />
            </span>
            <p className="mt-4 text-[19px] font-semibold text-ink">{t.data.dropTitle}</p>
            <p className="mt-1.5 max-w-[46ch] text-sm text-ink-3">{t.data.dropHint}</p>
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
            <PanelTitle id="report-title">{t.data.result}</PanelTitle>
            <p className="tnum mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-ink-2">
              <span>
                {t.data.loaded}: <strong className="text-lg font-bold text-free">{report.loaded}</strong>
              </span>
              <span>
                {t.data.skipped}: <strong className="text-lg font-bold text-ink">{report.skipped}</strong>
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

        <CatalogTable reloadKey={catalogVersion} />

        <Panel className="p-5 sm:p-6" aria-labelledby="format-title">
          <PanelTitle id="format-title">{t.data.formatTitle}</PanelTitle>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {REQUIRED_COLUMNS.map((column) => (
              <li key={column} className="mono rounded bg-sunken px-2 py-0.5 text-[13px] text-ink-2">
                {column}
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-[80ch] text-[15px] leading-relaxed text-ink-2">{t.data.formatBody(REQUIRED_COLUMNS.join(', '))}</p>
        </Panel>
      </div>
    </div>
  )
}
