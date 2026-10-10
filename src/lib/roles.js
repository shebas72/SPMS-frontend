const roleNames = (user) => [user?.role, ...(user?.roles ?? [])].filter(Boolean).map((r) => (typeof r === 'string' ? r : r.name))

// Mirrors the API: admin/manager manage data, admin/manager/employee enter KPI actuals, viewers read only.
// If the user has no role info, show the controls and let a 403 surface.
export function canEdit(user) {
  const names = roleNames(user)
  return names.length === 0 || names.some((r) => ['admin', 'manager'].includes(r))
}
export function canEnter(user) {
  const names = roleNames(user)
  return names.length === 0 || names.some((r) => ['admin', 'manager', 'employee'].includes(r))
}

// Departments the user may change (their own, with sub-departments). access.edit_department_ids is null when unrestricted.
export function canEditDepartment(user, departmentId) {
  const ids = user?.access?.edit_department_ids
  if (ids == null) return true
  return departmentId != null && ids.includes(Number(departmentId))
}
export const canEditKpi = (user, kpi) => canEdit(user) && canEditDepartment(user, kpi?.department_id)
export const canEnterKpi = (user, kpi) => canEnter(user) && canEditDepartment(user, kpi?.department_id)

// Projects, initiatives and corrective proposals follow the same department rules as KPIs (item = { department_id, owner_id, submitted_by }).
// Managing an item needs the admin/manager role in its department; its owner (never a read-only viewer) can also report progress and keep its plan.
export const canManageItem = (user, item) => canEdit(user) && canEditDepartment(user, item?.department_id)
export const canWorkOnItem = (user, item) =>
  canManageItem(user, item) || (item?.owner_id != null && item.owner_id === user?.id && !roleNames(user).includes('viewer'))
