import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { ErrorBox } from './ErrorBox'
import { Skeleton } from './Skeleton'

interface TeamPanelProps {
  query: string
  industry: string | null
  hideBusy: boolean
  onOpen: (expertId: string) => void
}

export function TeamPanel({ query, industry, hideBusy, onOpen }: TeamPanelProps) {
  const { t, lang } = useI18n()
  const team = useAsync(() => api.team({ query, industry, hide_busy: hideBusy }), [query, industry, hideBusy, lang])
  const coverage = team.data?.coverage ?? []
  const terms = Object.keys(coverage[0]?.terms ?? {})

  return (
    <section className="border-2 border-ink bg-white p-6 sm:p-8" aria-labelledby="team-title">
      <h3 id="team-title" className="font-display text-3xl font-light tracking-[-0.03em]">
        {t.team.title}
      </h3>
      {team.isLoading && <Skeleton className="mt-5 h-28 w-full" />}
      {team.error && (
        <div className="mt-4">
          <ErrorBox message={team.error} />
        </div>
      )}
      {team.data && (
        <>
          <p className="mt-3 text-[15px] text-muted">
            {team.data.members.length === 0
              ? t.team.none
              : team.data.complete
                ? t.team.complete
                : t.team.notCovered(team.data.uncovered_terms.join(', '))}
          </p>
          {team.data.members.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[15px]">
                <thead>
                  <tr className="border-b-2 border-ink text-muted">
                    <th className="py-2 pr-3 font-medium">{t.team.expert}</th>
                    {terms.map((term) => (
                      <th key={term} className="px-2 py-2 font-medium">
                        {term}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {team.data.members.map((member) => {
                    const row = coverage.find((item) => item.expert_id === member.id)
                    return (
                      <tr key={member.id} className="border-b border-rule last:border-0">
                        <td className="py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => onOpen(member.id)}
                            className="cursor-pointer text-left font-semibold text-cobalt-deep underline decoration-[1.5px] underline-offset-4 hover:decoration-lime"
                          >
                            {member.full_name}
                          </button>
                          <span className="block text-sm text-muted">
                            {member.position}, {member.city}
                          </span>
                        </td>
                        {terms.map((term) => (
                          <td key={term} className="px-2 py-3 font-semibold">
                            {row?.terms[term] ? (
                              <span aria-label={t.team.covers} className="text-cobalt">
                                ✓
                              </span>
                            ) : (
                              <span aria-label={t.team.notCovers} className="text-ash-deep">
                                —
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}
