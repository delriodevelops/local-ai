// 2026-03 → Mar 2026
export const monthOf = (released: string) => {
  const [year, month] = released.split('-').map(Number)
  return new Date(year, month - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' })
}
