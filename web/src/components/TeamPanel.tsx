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
    <section className="bg-plaster p-6 text-left sm:p-8" aria-labelledby="team-title">
      <h3 id="team-title" className="font-display text-2xl font-light tracking-[-0.02em]">
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
          <p className="mt-3 text-[15px] text-slate">
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
                  <tr className="border-b-2 border-grout text-slate">
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
                      <tr key={member.id} className="border-b border-seam last:border-0">
                        <td className="py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => onOpen(member.id)}
                            className="min-h-11 cursor-pointer text-left font-semibold text-turquoise-deep underline decoration-[1.5px] underline-offset-4 hover:decoration-ochre"
                          >
                            {member.full_name}
                          </button>
                          <span className="block text-sm text-slate">
                            {member.position}, {member.city}
                          </span>
                        </td>
                        {terms.map((term) => (
                          <td key={term} className="px-2 py-3 font-semibold">
                            {row?.terms[term] ? (
                              <span role="img" aria-label={t.team.covers} className="tile inline-block size-4 bg-turquoise" />
                            ) : (
                              <span role="img" aria-label={t.team.notCovers} className="inline-block size-4 bg-seam" />
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
