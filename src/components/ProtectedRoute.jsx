import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

/**
 * ProtectedRoute — Wraps routes that require authentication.
 * Optionally restricts access to specific roles.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string} [props.requiredRole] - Optional role ('pencatat' | 'pengawas')
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Wait for profile to load before checking role
  if (requiredRole && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memverifikasi akses...</p>
        </div>
      </div>
    )
  }

  if (requiredRole && profile?.role !== requiredRole) {
    // Redirect to appropriate dashboard based on actual role
    const redirectPath = profile?.role === 'pengawas' ? '/pengawas' : '/pencatat'
    return <Navigate to={redirectPath} replace />
  }

  return children
}
