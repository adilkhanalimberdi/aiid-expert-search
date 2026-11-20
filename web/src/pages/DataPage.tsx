import { useRef, useState, type DragEvent } from 'react'
import { CatalogTable } from '../components/CatalogTable'
import { ErrorBox } from '../components/ErrorBox'
import { Skeleton } from '../components/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { api, type UploadResponse } from '../lib/api'

const REQUIRED_COLUMNS = [
  'id',
  'full_name',
  'position',
  'industry',
  'competencies',
  'city',
  'experience_years',
  'availability',
]

export function DataPage() {
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
    <div className="mx-auto max-w-[1160px] space-y-6 px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold">Data</h1>

      <section className="rounded-2xl border border-line bg-white p-5" aria-label="Current database">
        <h2 className="font-semibold">Current database</h2>
        {health.isLoading && <Skeleton className="mt-3 h-5 w-64" />}
        {health.error && <ErrorBox message={health.error} />}
        {health.data && (
          <p className="mt-2 text-ink-soft">
            Experts: <strong>{health.data.experts}</strong> · model {health.data.model}
            {industries.data && ` · industries: ${industries.data.join(', ')}`}
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
        className={`rounded-2xl border-2 border-dashed p-8 text-center ${isDragging ? 'border-teal bg-teal-tint' : 'border-line bg-white'}`}
        aria-label="CSV upload"
      >
        <p className="font-semibold">Drop a CSV file here</p>
        <p className="mt-1 text-sm text-muted">UTF-8, up to 10 MB. The index is rebuilt without restarting the server.</p>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Choose a CSV file"
          onChange={(event) => {
            void upload(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={isUploading}
          className="mt-4 rounded-xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {isUploading ? 'Uploading…' : 'Upload CSV'}
        </button>
      </section>

      {error && <ErrorBox message={error} />}

      {report && (
        <section className="rounded-2xl border border-line bg-white p-5" role="status">
          <h2 className="font-semibold">Upload result</h2>
          <p className="mt-2">
            Loaded: <strong className="text-free-fg">{report.loaded}</strong> · skipped:{' '}
            <strong>{report.skipped}</strong>
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

      <section className="rounded-2xl border border-line bg-white p-5" aria-label="File format">
        <h2 className="font-semibold">File format</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Required columns: {REQUIRED_COLUMNS.map((column) => `“${column}”`).join(', ')}. Separate skills with “;”,
          status: available, partial or busy. Russian headers such as “ФИО”, “Город”, “Статус” are accepted too.
        </p>
      </section>
    </div>
  )
}
