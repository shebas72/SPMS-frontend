import { useTranslation } from 'react-i18next'

// Permission keys match App\Support\Permissions on the server, which enforces them; this only decides what to show.
// A session without permission info (signed in before roles became configurable) shows the controls and lets a 403 surface.
export const can = (user, permission) => !Array.isArray(user?.permissions) || user.permissions.includes(permission)

export const canEdit = (user) => can(user, 'kpis.manage') // KPIs and their targets
export const canEnter = (user) => can(user, 'kpis.enter') // KPI actuals

// Departments the user may change (their own, with sub-departments). access.edit_department_ids is null when unrestricted.
export function canEditDepartment(user, departmentId) {
  const ids = user?.access?.edit_department_ids
  if (ids == null) return true
  return departmentId != null && ids.includes(Number(departmentId))
}
export const canEditKpi = (user, kpi) => canEdit(user) && canEditDepartment(user, kpi?.department_id)
export const canEnterKpi = (user, kpi) => canEnter(user) && canEditDepartment(user, kpi?.department_id)

// Projects, initiatives and corrective proposals follow the same department rules as KPIs (item = { department_id, owner_id, submitted_by }).
// Managing needs projects.manage in the item's department, reviewing a proposal needs proposals.review there;
// an owner whose role has work.own can also report progress and keep the plan.
export const canManageItem = (user, item) => can(user, 'projects.manage') && canEditDepartment(user, item?.department_id)
export const canReviewItem = (user, item) => can(user, 'proposals.review') && canEditDepartment(user, item?.department_id)
export const canWorkOnItem = (user, item) =>
  canManageItem(user, item) || (item?.owner_id != null && item.owner_id === user?.id && can(user, 'work.own'))

// The display name of a role key. labels = { key: { name, name_ar } } from the API; built-in roles fall back to the translation file.
export function useRoleLabel(labels) {
  const { t, i18n } = useTranslation()
  const ar = (i18n.language || '').startsWith('ar')
  return (key) => {
    const l = labels?.[key]
    return l ? (ar && l.name_ar) || l.name : t(`team.roles.${key}`, { defaultValue: key })
  }
}
