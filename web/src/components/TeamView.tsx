import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { ErrorBox } from './ErrorBox'
import { Icon } from './Icon'
import { Status } from './Status'
import { Panel, Skeleton } from './ui'

interface TeamViewProps {
  query: string
  industry: string | null
  hideBusy: boolean
  onOpen: (expertId: string) => void
}

/** Команда под запрос: участники строками, термины запроса столбцами, в клетке «покрывает / нет». */
export function TeamView({ query, industry, hideBusy, onOpen }: TeamViewProps) {
  const { t, lang } = useI18n()
  const team = useAsync(() => api.team({ query, industry, hide_busy: hideBusy }), [query, industry, hideBusy, lang])
  const coverage = team.data?.coverage ?? []
  const terms = Object.keys(coverage[0]?.terms ?? {})

  return (
    <Panel className="fade-in p-5 sm:p-6" aria-labelledby="team-title">
      <h2 id="team-title" className="serif text-[22px] font-semibold tracking-[-0.01em]">
        {t.team.title}
      </h2>
      {team.isLoading && <Skeleton className="mt-4 h-40 w-full" />}
      {team.error && (
        <div className="mt-4">
          <ErrorBox message={team.error} />
        </div>
      )}
      {team.data && (
        <>
          <p role="status" className={`mt-2 text-[15px] ${team.data.complete ? 'text-free' : 'text-ink-2'} font-medium`}>
            {team.data.members.length === 0
              ? t.team.none
              : team.data.complete
                ? t.team.complete
                : t.team.notCovered(team.data.uncovered_terms.join(', '))}
          </p>
          {team.data.members.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm" style={{ minWidth: 240 + terms.length * 96 }}>
                <thead>
                  <tr className="border-b border-line-strong text-ink-3">
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      {t.team.expert}
                    </th>
                    {terms.map((term) => (
                      <th key={term} scope="col" className="px-2 py-2 text-center font-semibold">
                        {term}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {team.data.members.map((member) => {
                    const row = coverage.find((item) => item.expert_id === member.id)
                    return (
                      <tr key={member.id} className="border-b border-line last:border-0">
                        <th scope="row" className="py-3 pr-4 text-left font-normal">
                          <button
                            type="button"
                            onClick={() => onOpen(member.id)}
                            className="serif text-left text-base font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:text-brand-deep hover:decoration-brand"
                          >
                            {member.full_name}
                          </button>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-ink-2">
                            {member.position}, {member.city}
                            <Status availability={member.availability} />
                          </span>
                        </th>
                        {terms.map((term) => {
                          const covers = Boolean(row?.terms[term])
                          return (
                            <td key={term} className="px-2 py-3 text-center">
                              <span
                                role="img"
                                aria-label={`${term}: ${covers ? t.team.covers : t.team.notCovers}`}
                                className={`inline-grid size-7 place-items-center rounded-full text-sm font-bold ${
                                  covers ? 'bg-brand text-surface' : 'border border-dashed border-line-strong text-ink-3'
                                }`}
                              >
                                <Icon name={covers ? 'check' : 'x'} size={14} strokeWidth={covers ? 2.6 : 2} />
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Panel>
  )
}
