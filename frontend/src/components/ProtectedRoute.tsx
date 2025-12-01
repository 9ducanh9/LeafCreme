// Protected Route wrapper - redirects to login if not authenticated
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: string[]
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check role if required
  if (requireRole && user) {
    const userRole = user.vaitro?.ten_vai_tro
    if (!userRole || !requireRole.includes(userRole)) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}


