import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import LoadingSpinner from '../../ui/LoadingSpinner'

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, loading, can } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user || !can('admin.access')) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

interface AdminCapabilityRouteProps {
  capability: string
  children: React.ReactNode
}

export function AdminCapabilityRoute({ capability, children }: AdminCapabilityRouteProps) {
  const { user, loading, can } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  }
  if (!user || !can('admin.access')) return <Navigate to="/" replace />
  if (!can(capability)) return <Navigate to={can('orders.read.all') ? '/admin/orders' : '/admin'} replace />
  return <>{children}</>
}

