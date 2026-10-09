import AuthFrame from '../components/auth/AuthFrame'
import SocialSignIn from '../components/auth/SocialSignIn'
import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { cognitoEnabled } from '../config/cognito'

const inputClassName = 'w-full rounded-md border border-interactive bg-bg-surface px-11 py-3 text-fg placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow] focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:bg-bg-inset disabled:opacity-70'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(username, password)
      const from = typeof location.state?.from === 'string' ? location.state.from : '/'
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
      setError((typeof detail === 'string' && detail) || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFrame title="Chào mừng bạn trở lại" description="Đăng nhập để theo dõi đơn hàng và chọn bánh cùng Leaf Creme.">
      <SocialSignIn disabled={loading} onBusyChange={setSocialLoading} />
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-4 py-3 text-sm leading-6 text-danger">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-text-primary">Tên đăng nhập hoặc email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} aria-hidden="true" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className={inputClassName}
                  placeholder="Nhập tên đăng nhập hoặc email"
                  disabled={loading || !!socialLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-text-primary">Mật khẩu</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={cognitoEnabled ? 10 : 6}
                  className={inputClassName}
                  placeholder="Nhập mật khẩu"
                  disabled={loading || !!socialLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg focus-visible:ring-2 focus-visible:ring-focus"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  disabled={loading || !!socialLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" className="mt-2 w-full py-3.5" disabled={loading || !!socialLoading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-text-secondary">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-accent-brown underline-offset-4 hover:underline">
              Đăng ký ngay
            </Link>
          </p>
    </AuthFrame>
  )
}
