// Admin Protected Route - only allows admin users
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import LoadingSpinner from '../../ui/LoadingSpinner'

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Check if user is admin
  const isAdmin = user?.vaitro?.ten_vai_tro?.toLowerCase() === 'admin' || 
                  user?.vaitro?.vaitro_id === 1 // Assuming admin role_id is 1

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

