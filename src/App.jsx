import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '@/features/auth/LoginPage'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import PlaceholderPage from '@/pages/PlaceholderPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import StrategyMapPage from '@/features/strategy-map/StrategyMapPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ObjectivesPage from '@/features/objectives/ObjectivesPage'
import StrategyHousePage from '@/features/strategy-house/StrategyHousePage'
import KpiEntryPage from '@/features/kpi-entry/KpiEntryPage'
import KpisPage from '@/features/kpis/KpisPage'
import KpiCardPage from '@/features/kpis/KpiCardPage'
import DepartmentsPage from '@/features/departments/DepartmentsPage'
import AnalysisPage from '@/features/analysis/AnalysisPage'
import ProjectsPage from '@/features/projects/ProjectsPage'
import InitiativesPage from '@/features/initiatives/InitiativesPage'

const PAGES = [
  
  // ['projects', 'nav.projects'],
  
]

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="strategy-map" element={<StrategyMapPage />} />
          {PAGES.map(([path, key]) => (
            <Route key={path} path={path} element={<PlaceholderPage titleKey={key} />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
          <Route path="objectives" element={<ObjectivesPage />} />
          <Route path="strategy-house" element={<StrategyHousePage />} />
          <Route path="kpi-entry" element={<KpiEntryPage />} />
          <Route path="kpis" element={<KpisPage />} />
          <Route path="kpis/:id" element={<KpiCardPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="initiatives" element={<InitiativesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      
    </Routes>
  )
}
