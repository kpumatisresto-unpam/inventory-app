import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/pages/LoginPage'
import PencatatDashboard from '@/pages/pencatat/DashboardPage'
import PengawasDashboard from '@/pages/pengawas/DashboardPage'
import ItemsPage from '@/pages/shared/ItemsPage'
import NewLogPage from '@/pages/pencatat/NewLogPage'
import HistoryPage from '@/pages/pencatat/HistoryPage'
import ApprovalListPage from '@/pages/pengawas/ApprovalListPage'
import ApprovalDetailPage from '@/pages/pengawas/ApprovalDetailPage'
import ReportsPage from '@/pages/pengawas/ReportsPage'
import UserManagementPage from '@/pages/pengawas/UserManagementPage'

function RoleRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (profile?.role === 'pengawas') return <Navigate to="/pengawas" replace />
  return <Navigate to="/pencatat" replace />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Root redirect based on role */}
          <Route path="/" element={
            <ProtectedRoute><RoleRedirect /></ProtectedRoute>
          } />

          {/* Pencatat Routes */}
          <Route element={
            <ProtectedRoute requiredRole="pencatat"><AppLayout /></ProtectedRoute>
          }>
            <Route path="/pencatat" element={<PencatatDashboard />} />
            <Route path="/pencatat/items" element={<ItemsPage readOnly />} />
            <Route path="/pencatat/new" element={<NewLogPage />} />
            <Route path="/pencatat/history" element={<HistoryPage />} />
            <Route path="/pencatat/history/:id" element={<HistoryPage />} />
          </Route>

          {/* Pengawas Routes */}
          <Route element={
            <ProtectedRoute requiredRole="pengawas"><AppLayout /></ProtectedRoute>
          }>
            <Route path="/pengawas" element={<PengawasDashboard />} />
            <Route path="/pengawas/items" element={<ItemsPage />} />
            <Route path="/pengawas/approval" element={<ApprovalListPage />} />
            <Route path="/pengawas/approval/:id" element={<ApprovalDetailPage />} />
            <Route path="/pengawas/reports" element={<ReportsPage />} />
            <Route path="/pengawas/users" element={<UserManagementPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
