import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import LoadingSpinner from '../../ui/LoadingSpinner'

// Gates the whole /admin/* shell to back-office roles. This used to check
// for 'admin' only, which locked manager/staff out of every admin page
// even though the backend routers underneath (alerts, batches, gift
// boxes, the Operations Agent, ...) already accept admin/manager/staff via
// require_role(...) — the two layers disagreed on who's allowed in. The
// route guard only decides who can open the section; each backend
// endpoint still enforces its own (sometimes tighter, e.g. admin/manager-
// only for delete or approve) role requirement, so loosening this doesn't
// grant staff anything the API wasn't already willing to do.
const BACK_OFFICE_ROLES = new Set(['admin', 'manager', 'staff'])

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

  const roleName = user?.vaitro?.ten_vai_tro?.toLowerCase()
  const isBackOffice = (roleName && BACK_OFFICE_ROLES.has(roleName)) || user?.vaitro?.vaitro_id === 1 // Assuming admin role_id is 1

  if (!user || !isBackOffice) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

