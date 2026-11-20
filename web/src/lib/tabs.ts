export const TABS = ['search', 'data', 'analytics'] as const
export type TabId = (typeof TABS)[number]
