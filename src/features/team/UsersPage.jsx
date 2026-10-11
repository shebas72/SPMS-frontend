import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { isAdmin } from '@/lib/admin'
import { fetchAll } from '@/lib/fetchAll'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useFormat } from '@/features/dashboard/ui'

const field = 'h-9 rounded-md border border-line bg-white px-2 text-sm'
const msg = (e, fallback) => e?.response?.data?.errors?.email?.[0] || e?.response?.data?.message || fallback

function InviteLink({ notice }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  return (
    <div className="space-y-2 rounded-lg border border-ink bg-white p-4 text-sm" role="status">
      <p>{t(notice.emailed ? 'team.sentEmailed' : 'team.sentLinkOnly', { email: notice.email })}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input readOnly className={cn(field, 'min-w-64 flex-1 font-mono text-xs')} value={notice.invite_url} onFocus={(e) => e.target.select()} aria-label={t('team.inviteLink')} />
        <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard?.writeText(notice.invite_url); setCopied(true) }}>{copied ? t('team.copied') : t('team.copy')}</Button>
      </div>
    </div>
  )
}

function Copyable({ value, label }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input readOnly className={cn(field, 'min-w-64 flex-1 font-mono text-xs')} value={value} onFocus={(e) => e.target.select()} aria-label={label} />
      <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard?.writeText(value); setCopied(true) }}>{copied ? t('team.copied') : t('team.copy')}</Button>
    </div>
  )
}

const Lbl = ({ label, children, className }) => (
  <label className={cn('block text-sm', className)}><span className="mb-1 block text-muted">{label}</span>{children}</label>
)

const SCOPES = ['own', 'all', 'selected']

// Departments as an indented list, parents first.
function flatten(departments) {
  const byParent = {}
  departments.forEach((d) => { (byParent[d.parent_id ?? 0] ??= []).push(d) })
  const out = []
  const walk = (parent, depth) => (byParent[parent] ?? []).forEach((d) => { out.push({ d, depth }); walk(d.id, depth + 1) })
  walk(0, 0)
  return out
}

function DeptChecklist({ label, departments, value, onChange }) {
  const { pick } = useFormat()
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  return (
    <fieldset className="text-sm">
      <legend className="mb-1 text-muted">{label}</legend>
      <div className="max-h-48 overflow-y-auto rounded-md border border-line bg-white p-2">
        {flatten(departments).map(({ d, depth }) => (
          <label key={d.id} className="flex items-center gap-2 py-0.5" style={{ paddingInlineStart: depth * 16 }}>
            <input type="checkbox" checked={value.includes(d.id)} onChange={() => toggle(d.id)} />
            {pick(d)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Manager, what the person can see, and their own departments. Admins always see and edit everything.
function AccessFields({ role, f, setF, departments, managers }) {
  const { t } = useTranslation()
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  if (role === 'admin') return <p className="text-xs text-muted">{t('team.access.adminAll')}</p>
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Lbl label={t('team.access.manager')}>
          <select className={cn(field, 'w-full')} value={f.manager_id} onChange={set('manager_id')}>
            <option value="">—</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Lbl>
        <Lbl label={t('team.access.scope')}>
          <select className={cn(field, 'w-full')} value={f.access_scope} onChange={set('access_scope')}>
            {SCOPES.map((s) => <option key={s} value={s}>{t(`team.access.scopes.${s}`)}</option>)}
          </select>
        </Lbl>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DeptChecklist label={t('team.access.own')} departments={departments} value={f.department_ids} onChange={(v) => setF((x) => ({ ...x, department_ids: v }))} />
        {f.access_scope === 'selected' && (
          <DeptChecklist label={t('team.access.chosen')} departments={departments} value={f.access_department_ids} onChange={(v) => setF((x) => ({ ...x, access_department_ids: v }))} />
        )}
      </div>
      <p className="text-xs text-muted">{t(`team.access.hint.${f.access_scope}`)} {t('team.access.editHint')}</p>
    </div>
  )
}

function AddUserForm({ roles, departments, managers }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [f, setF] = useState({ name: '', email: '', role: 'viewer', password: '', access_scope: 'own', manager_id: '', department_ids: [], access_department_ids: [] })
  const [created, setCreated] = useState(null)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const create = useMutation({
    mutationFn: () => api.post('/users', { ...f, password: f.password || null, manager_id: f.manager_id || null }),
    onSuccess: (res) => { setCreated(res.data.data); setF({ ...f, name: '', email: '', password: '', manager_id: '' }); qc.invalidateQueries({ queryKey: ['team-users'] }) },
  })
  return (
    <section className="space-y-4 rounded-lg border border-line bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold">{t('team.addTitle')}</h2>
        <p className="mt-1 text-xs text-muted">{t('team.addHint')}</p>
      </div>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setCreated(null); create.mutate() }}>
        <div className="grid gap-3 md:grid-cols-5 md:items-end">
        <Lbl label={t('team.col.name')}><input required className={cn(field, 'w-full')} value={f.name} onChange={set('name')} /></Lbl>
        <Lbl label={t('team.email')}><input required type="email" className={cn(field, 'w-full')} value={f.email} onChange={set('email')} /></Lbl>
        <Lbl label={t('team.role')}><select className={cn(field, 'w-full')} value={f.role} onChange={set('role')}>{roles.map((r) => <option key={r} value={r}>{t(`team.roles.${r}`)}</option>)}</select></Lbl>
        <Lbl label={t('team.passwordOptional')}><input type="password" minLength={8} autoComplete="new-password" className={cn(field, 'w-full')} value={f.password} onChange={set('password')} /></Lbl>
        <Button type="submit" size="sm" disabled={create.isPending}>{create.isPending ? t('team.adding') : t('team.addUser')}</Button>
        </div>
        <AccessFields role={f.role} f={f} setF={setF} departments={departments} managers={managers} />
      </form>
      {create.isError && <p role="alert" className="text-sm text-[#A32B1E]">{create.error?.response?.data?.errors?.email?.[0] || create.error?.response?.data?.message || t('team.actionError')}</p>}
      {created && (
        <div role="status" className="space-y-2 rounded-lg border border-ink p-4 text-sm">
          <p>{t('team.created', { email: created.email })}</p>
          {created.temporary_password && <><p className="text-xs text-muted">{t('team.tempPassword')}</p><Copyable value={created.temporary_password} label={t('team.tempPasswordLabel')} /></>}
        </div>
      )}
    </section>
  )
}

function EditUserForm({ user, self, onDone, departments, managers }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [f, setF] = useState({
    name: user.name, email: user.email, password: '',
    access_scope: user.access_scope ?? 'all', manager_id: user.manager_id ? String(user.manager_id) : '',
    department_ids: user.department_ids ?? [], access_department_ids: user.access_department_ids ?? [],
  })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = useMutation({
    mutationFn: () => api.put(`/users/${user.id}`, {
      name: f.name, email: f.email, ...(f.password ? { password: f.password } : {}),
      access_scope: f.access_scope, manager_id: f.manager_id || null, department_ids: f.department_ids, access_department_ids: f.access_department_ids,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-users'] }); qc.invalidateQueries({ queryKey: ['me'] }); onDone() },
  })
  return (
    <form className="space-y-4 rounded-lg border border-ink bg-white p-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <h2 className="text-sm font-semibold">{t('team.editTitle', { name: user.name })}</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Lbl label={t('team.col.name')}><input required className={cn(field, 'w-full')} value={f.name} onChange={set('name')} /></Lbl>
        <Lbl label={t('team.email')}><input required type="email" className={cn(field, 'w-full')} value={f.email} onChange={set('email')} /></Lbl>
        {!self && <Lbl label={t('team.newPassword')}><input type="password" minLength={8} autoComplete="new-password" className={cn(field, 'w-full')} value={f.password} onChange={set('password')} /></Lbl>}
      </div>
      <AccessFields role={user.role} f={f} setF={setF} departments={departments} managers={managers.filter((m) => m.id !== user.id)} />
      {self ? <p className="text-xs text-muted">{t('team.selfHint')}</p> : <p className="text-xs text-muted">{t('team.resetHint')}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? t('team.saving') : t('team.save')}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>{t('team.cancel')}</Button>
        {save.isError && <span role="alert" className="text-sm text-[#A32B1E]">{save.error?.response?.data?.errors?.email?.[0] || save.error?.response?.data?.message || t('team.actionError')}</span>}
      </div>
    </form>
  )
}

export default function UsersPage() {
  const { t } = useTranslation()
  const { pick } = useFormat()
  const qc = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const [form, setForm] = useState({ email: '', role: 'viewer', access_scope: 'own', manager_id: '', department_ids: [], access_department_ids: [] })
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const users = useQuery({ queryKey: ['team-users'], queryFn: async () => (await api.get('/users')).data, enabled: isAdmin(me) })
  const departments = useQuery({ queryKey: ['lookup-departments'], queryFn: () => fetchAll('/departments'), enabled: isAdmin(me) })
  const invites = useQuery({ queryKey: ['team-invites'], queryFn: async () => (await api.get('/invitations')).data.data, enabled: isAdmin(me) })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['team-users'] }); qc.invalidateQueries({ queryKey: ['team-invites'] }) }
  const fail = (e) => setError(msg(e, t('team.actionError')))

  const invite = useMutation({
    mutationFn: () => api.post('/invitations', form.role === 'admin'
      ? { email: form.email, role: form.role }
      : { ...form, manager_id: form.manager_id || null }),
    onSuccess: (res) => { setNotice(res.data.data); setError(''); setForm((f) => ({ ...f, email: '' })); refresh() },
    onError: fail,
  })
  const resend = useMutation({ mutationFn: (id) => api.post(`/invitations/${id}/resend`), onSuccess: (res) => { setNotice(res.data.data); setError(''); refresh() }, onError: fail })
  const revoke = useMutation({ mutationFn: (id) => api.delete(`/invitations/${id}`), onSuccess: () => { setError(''); refresh() }, onError: fail })
  const update = useMutation({ mutationFn: ({ id, ...body }) => api.put(`/users/${id}`, body), onSuccess: () => { setError(''); refresh() }, onError: fail })

  if (!isAdmin(me)) return <p className="text-muted">{t('team.adminOnly')}</p>
  if (users.isLoading || invites.isLoading) return <p className="text-muted">{t('common.loading')}</p>
  if (users.isError || invites.isError) {
    return (
      <div className="max-w-md rounded-lg border border-line bg-white p-5">
        <p className="text-sm">{t('team.error')}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={refresh}>{t('dashboard.retry')}</Button>
      </div>
    )
  }
  const roles = users.data.meta.roles
  const depts = departments.data ?? []
  const managers = users.data.data.filter((u) => u.is_active && ['admin', 'manager'].includes(u.role))
  const accessText = (u) => {
    if (u.role === 'admin' || u.access_scope === 'all') return t('team.access.allDepartments')
    const ids = u.access_scope === 'selected' ? u.access_department_ids : u.department_ids
    const names = ids.map((id) => depts.find((d) => d.id === id)).filter(Boolean).map((d) => pick(d))
    if (!names.length) return t('team.access.none')
    return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('nav.users')}</h1>
        <p className="mt-1 text-sm text-muted">{t('team.hint')}</p>
      </div>
      {error && <p role="alert" className="text-sm text-[#A32B1E]">{error}</p>}

      <section className="space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-sm font-semibold">{t('team.inviteTitle')}</h2>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setNotice(null); invite.mutate() }}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-64 flex-1 text-sm"><span className="mb-1 block text-muted">{t('team.email')}</span>
              <input required type="email" className={cn(field, 'w-full')} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></label>
            <label className="block text-sm"><span className="mb-1 block text-muted">{t('team.role')}</span>
              <select className={field} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>{roles.map((r) => <option key={r} value={r}>{t(`team.roles.${r}`)}</option>)}</select></label>
            <Button type="submit" size="sm" disabled={invite.isPending}>{invite.isPending ? t('team.sending') : t('team.send')}</Button>
          </div>
          <AccessFields role={form.role} f={form} setF={setForm} departments={depts} managers={managers} />
          <p className="text-xs text-muted">{t('team.inviteAccessHint')}</p>
        </form>
        <p className="text-xs text-muted">{roles.map((r) => `${t(`team.roles.${r}`)}: ${t(`team.roleHints.${r}`)}`).join(' · ')}</p>
        {notice && <InviteLink notice={notice} />}
      </section>

      <AddUserForm roles={roles} departments={depts} managers={managers} />

      <section className="rounded-lg border border-line bg-white">
        <h2 className="p-5 pb-3 text-sm font-semibold">{t('team.pending')}</h2>
        {invites.data.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">{t('team.noPending')}</p> : (
          <ul className="divide-y divide-line border-t border-line">
            {invites.data.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
                <span className="min-w-56 flex-1">
                  <span className="block font-medium">{i.email}</span>
                  {i.role !== 'admin' && <span className="block text-xs text-muted">{accessText(i)}</span>}
                </span>
                <span className="text-xs text-muted">{t(`team.roles.${i.role}`)}</span>
                <span className="text-xs" style={{ color: i.expired ? '#A32B1E' : undefined }}>{i.expired ? t('team.expired') : t('team.expires', { date: i.expires_at })}</span>
                <span className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={resend.isPending} onClick={() => { setNotice(null); resend.mutate(i.id) }}>{t('team.resend')}</Button>
                  <Button size="sm" variant="outline" disabled={revoke.isPending} onClick={() => window.confirm(t('team.confirmRevoke')) && revoke.mutate(i.id)}>{t('team.revoke')}</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && <EditUserForm key={editing.id} user={editing} self={editing.id === users.data.meta.me} onDone={() => setEditing(null)} departments={depts} managers={managers} />}

      <section className="overflow-x-auto rounded-lg border border-line bg-white">
        <h2 className="p-5 pb-3 text-sm font-semibold">{t('team.members')}</h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-y border-line text-xs text-muted"><tr>{['name', 'email', 'role', 'access', 'status'].map((c) => <th key={c} className="px-4 py-2.5 text-start font-medium">{t(`team.col.${c}`)}</th>)}<th /></tr></thead>
          <tbody className="divide-y divide-line">
            {users.data.data.map((u) => {
              const self = u.id === users.data.meta.me
              return (
                <tr key={u.id} className={cn(!u.is_active && 'text-muted')}>
                  <td className="px-4 py-3 font-medium">{u.name}{self && <span className="ms-1 text-xs font-normal text-muted">{t('team.you')}</span>}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <select className={field} value={u.role ?? ''} disabled={self || update.isPending} aria-label={`${t('team.role')} ${u.name}`} onChange={(e) => update.mutate({ id: u.id, role: e.target.value })}>
                      {!u.role && <option value="">—</option>}
                      {roles.map((r) => <option key={r} value={r}>{t(`team.roles.${r}`)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs">{accessText(u)}</td>
                  <td className="px-4 py-3 text-xs">{t(u.is_active ? 'team.active' : 'team.inactive')}</td>
                  <td className="space-x-2 px-4 py-3 text-end rtl:space-x-reverse">
                    <Button size="sm" variant="outline" onClick={() => setEditing(u)}>{t('team.edit')}</Button>
                    {!self && <Button size="sm" variant="outline" disabled={update.isPending}
                      onClick={() => (u.is_active ? window.confirm(t('team.confirmDeactivate', { name: u.name })) : true) && update.mutate({ id: u.id, is_active: !u.is_active })}>
                      {t(u.is_active ? 'team.deactivate' : 'team.activate')}</Button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
