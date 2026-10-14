import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useFormat } from '@/features/dashboard/ui'

const input = 'h-9 w-full rounded-md border border-line bg-white px-2 text-sm'

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x))
const errorOf = (e) => e?.response?.data?.errors?.name?.[0] || e?.response?.data?.message

/** Roles and the permission matrix: one column per role, one row per permission. */
export default function RolesPage() {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get('/roles')).data })
  const [draft, setDraft] = useState({})
  const [adding, setAdding] = useState(null) // null = closed, { name, name_ar } = open
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (q.data) setDraft(Object.fromEntries(q.data.data.map((r) => [r.id, { name: r.name, name_ar: r.name_ar ?? '', permissions: r.permissions }])))
  }, [q.data])

  const save = useMutation({
    mutationFn: async () => {
      for (const r of q.data.data) {
        const d = draft[r.id]
        if (!d || (d.name === r.name && d.name_ar === (r.name_ar ?? '') && sameSet(d.permissions, r.permissions))) continue
        await api.put(`/roles/${r.id}`, { name: d.name, name_ar: d.name_ar || null, permissions: d.permissions })
      }
    },
    onSuccess: () => { setError(''); setSaved(true); qc.invalidateQueries({ queryKey: ['roles'] }); qc.invalidateQueries({ queryKey: ['me'] }) },
    onError: (e) => setError(errorOf(e) || t('roles.error')),
  })
  const create = useMutation({
    mutationFn: () => api.post('/roles', { name: adding.name, name_ar: adding.name_ar || null, permissions: [] }),
    onSuccess: () => { setError(''); setAdding(null); qc.invalidateQueries({ queryKey: ['roles'] }) },
    onError: (e) => setError(errorOf(e) || t('roles.error')),
  })
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/roles/${id}`),
    onSuccess: () => { setError(''); qc.invalidateQueries({ queryKey: ['roles'] }) },
    onError: (e) => setError(errorOf(e) || t('roles.error')),
  })

  if (q.isError) return <p role="alert" className="text-[#A32B1E]">{q.error?.response?.data?.message || t('roles.error')}</p>
  if (!q.data) return <p className="text-muted">…</p>

  const roles = q.data.data
  const groups = q.data.meta.groups
  const editable = q.data.meta.can_customize
  const dirty = roles.some((r) => {
    const d = draft[r.id]
    return d && (d.name !== r.name || d.name_ar !== (r.name_ar ?? '') || !sameSet(d.permissions, r.permissions))
  })

  const edit = (id, patch) => { setSaved(false); setDraft((x) => ({ ...x, [id]: { ...x[id], ...patch } })) }
  const toggle = (r, permission) => {
    const cur = draft[r.id]?.permissions ?? r.permissions
    edit(r.id, { permissions: cur.includes(permission) ? cur.filter((p) => p !== permission) : [...cur, permission] })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.roles')}</h1>
          <p className="mt-1 text-sm text-muted">{t('roles.intro')}</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span role="status" className="text-sm text-muted">{t('roles.saved')}</span>}
          <Button size="sm" variant="outline" disabled={!editable || adding !== null} onClick={() => setAdding({ name: '', name_ar: '' })}>{t('roles.add')}</Button>
          <Button size="sm" disabled={!editable || !dirty || save.isPending} onClick={() => save.mutate()}>{save.isPending ? '…' : t('roles.save')}</Button>
        </div>
      </div>

      {!editable && <p role="status" className="rounded-md border border-line bg-white p-3 text-sm text-muted">{t('roles.planLocked')}</p>}
      {error && <p role="alert" className="text-sm text-[#A32B1E]">{error}</p>}

      {adding && (
        <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
          <label className="block text-sm"><span className="mb-1 block text-muted">{t('roles.name')}</span>
            <input className={input} required maxLength={60} value={adding.name} onChange={(e) => setAdding((a) => ({ ...a, name: e.target.value }))} /></label>
          <label className="block text-sm"><span className="mb-1 block text-muted">{t('roles.nameAr')}</span>
            <input className={input} dir="rtl" maxLength={60} value={adding.name_ar} onChange={(e) => setAdding((a) => ({ ...a, name_ar: e.target.value }))} /></label>
          <Button size="sm" type="submit" disabled={create.isPending}>{t('roles.create')}</Button>
          <Button size="sm" type="button" variant="outline" onClick={() => setAdding(null)}>{t('roles.cancel')}</Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line align-top">
            <tr>
              <th className="w-72 px-4 py-3 text-start text-xs font-medium text-muted">{t('roles.permission')}</th>
              {roles.map((r) => {
                const d = draft[r.id] ?? { name: r.name, name_ar: r.name_ar ?? '' }
                return (
                  <th key={r.id} className="min-w-36 px-3 py-3 text-start font-normal">
                    <input className={cn(input, 'font-medium')} aria-label={t('roles.name')} disabled={!editable} value={d.name} onChange={(e) => edit(r.id, { name: e.target.value })} />
                    <input className={cn(input, 'mt-1')} dir="rtl" aria-label={t('roles.nameAr')} placeholder={t('roles.nameAr')} disabled={!editable} value={d.name_ar} onChange={(e) => edit(r.id, { name_ar: e.target.value })} />
                    <div className="mt-1 flex items-center justify-between text-xs text-muted">
                      <span>{t('roles.people', { count: r.users_count })}</span>
                      {!r.is_system && editable && (
                        <button type="button" className="text-[#A32B1E] underline" disabled={remove.isPending}
                          onClick={() => { if (window.confirm(t('roles.confirmDelete', { name: pick(r) }))) remove.mutate(r.id) }}>{t('roles.delete')}</button>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groups).map(([group, perms]) => (
              <GroupRows key={group} group={group} perms={perms} roles={roles} draft={draft} editable={editable} toggle={toggle} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">{t('roles.adminLocked')}</p>
    </div>
  )
}

function GroupRows({ group, perms, roles, draft, editable, toggle }) {
  const { t } = useTranslation()
  return (
    <>
      <tr className="bg-[#F7F6F2]"><th colSpan={roles.length + 1} className="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wide text-muted">{t(`roles.group.${group}`)}</th></tr>
      {perms.map((p) => (
        <tr key={p} className="border-t border-line">
          <td className="px-4 py-2.5">
            <div className="font-medium">{t(`roles.perm.${p}`)}</div>
            <div className="text-xs text-muted">{t(`roles.hint.${p}`)}</div>
          </td>
          {roles.map((r) => {
            const on = (draft[r.id]?.permissions ?? r.permissions).includes(p)
            return (
              <td key={r.id} className="px-3 py-2.5">
                <input type="checkbox" className="h-4 w-4 accent-ink" checked={on} disabled={r.locked || !editable}
                  aria-label={`${t(`roles.perm.${p}`)} — ${draft[r.id]?.name ?? r.name}`} onChange={() => toggle(r, p)} />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}
