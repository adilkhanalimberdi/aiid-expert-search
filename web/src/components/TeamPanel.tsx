import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { ErrorBox } from './ErrorBox'
import { Skeleton } from './Skeleton'

interface TeamPanelProps {
  query: string
  industry: string | null
  hideBusy: boolean
  onOpen: (expertId: string) => void
}

export function TeamPanel({ query, industry, hideBusy, onOpen }: TeamPanelProps) {
  const team = useAsync(() => api.team({ query, industry, hide_busy: hideBusy }), [query, industry, hideBusy])
  const coverage = team.data?.coverage ?? []
  const terms = Object.keys(coverage[0]?.terms ?? {})

  return (
    <section className="rounded-2xl border border-line bg-white p-5" aria-labelledby="team-title">
      <h3 id="team-title" className="font-display text-base font-bold">
        Team for this query
      </h3>
      {team.isLoading && <Skeleton className="mt-4 h-28 w-full" />}
      {team.error && <ErrorBox message={team.error} />}
      {team.data && (
        <>
          <p className="mt-2 text-sm text-muted">
            {team.data.members.length === 0
              ? 'No suitable profiles for a team were found.'
              : team.data.complete
                ? 'The team covers every term of the query.'
                : `Not covered: ${team.data.uncovered_terms.join(', ') || 'no terms extracted'}.`}
          </p>
          {team.data.members.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2 pr-3 font-medium">Expert</th>
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
                      <tr key={member.id} className="border-b border-line last:border-0">
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => onOpen(member.id)}
                            className="text-left font-semibold text-teal hover:underline"
                          >
                            {member.full_name}
                          </button>
                          <span className="block text-xs text-muted">
                            {member.position}, {member.city}
                          </span>
                        </td>
                        {terms.map((term) => (
                          <td
                            key={term}
                            className={`px-2 py-2 font-semibold ${row?.terms[term] ? 'text-free-fg' : 'text-muted'}`}
                          >
                            <span aria-label={row?.terms[term] ? 'covers' : 'does not cover'}>
                              {row?.terms[term] ? '✓' : '—'}
                            </span>
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
