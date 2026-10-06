// Mirrors the API: only admin/manager may write. If the user has no role info, show the controls and let a 403 surface.
export function canEdit(user) {
  const names = [user?.role, ...(user?.roles ?? [])].filter(Boolean).map((r) => (typeof r === 'string' ? r : r.name))
  return names.length === 0 || names.some((r) => ['admin', 'manager'].includes(r))
}
