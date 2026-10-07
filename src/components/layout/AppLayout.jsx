import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Landmark, Network, Target, Building2, LineChart, ClipboardEdit, FolderKanban, ListChecks, Menu, LogOut, ListTodo,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { fetchMe, logout } from '@/features/auth/authApi'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'

const NAV = [
  { to: '/', key: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/strategy-house', key: 'strategyHouse', icon: Landmark },
  { to: '/strategy-map', key: 'strategyMap', icon: Network },
  { to: '/objectives', key: 'objectives', icon: Target },
  { to: '/departments', key: 'departments', icon: Building2 },
  { to: '/kpis', key: 'kpis', icon: LineChart },
  { to: '/kpi-entry', key: 'kpiEntry', icon: ClipboardEdit },
  { to: '/projects', key: 'projects', icon: FolderKanban },
  { to: '/analysis', key: 'analysis', icon: ListChecks },
  { to: '/initiatives', key: 'initiatives', icon: ListTodo }
]

export default function AppLayout() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { user, setUser, clear } = useAuthStore()

  // Refresh the signed-in user; a 401 here is handled by the API client.
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const me = await fetchMe()
      setUser(me)
      return me
    },
    staleTime: 5 * 60 * 1000,
  })

  const signOut = async () => {
    await logout()
    clear()
    navigate('/login', { replace: true })
  }

  const company = user?.company?.name ?? user?.company_name ?? ''
  const isArabic = (i18n.language || '').startsWith('ar')
  const companyLabel = isArabic ? user?.company?.name_ar || company : company

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      {open && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        className={cn(
  'fixed inset-y-0 start-0 z-40 w-[17rem] border-e border-line bg-white transition-transform lg:static',
  // The slide-away offset only applies below lg, so the desktop sidebar is never pushed off-screen in RTL.
  open ? 'translate-x-0' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full',
)}
      >
        <div className="flex h-16 items-center border-b border-line px-5">
          <span className="text-base font-semibold text-brand">{t('app.name')}</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                  isActive ? 'bg-brand text-white' : 'text-ink hover:bg-brand-soft',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t(`nav.${key}`)}
            </NavLink>
            
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-line bg-white px-4 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label={t('common.menu')}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1 truncate text-sm text-muted">{companyLabel}</div>
          <LanguageSwitcher />
          <div className="hidden text-sm font-medium sm:block">{user?.name}</div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {t('auth.signOut')}
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
