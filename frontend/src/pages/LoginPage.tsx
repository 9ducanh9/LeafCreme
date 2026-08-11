import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Mail, ShoppingBag } from 'lucide-react'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { FALLBACK_IMAGE } from '../constants/images'
import { cognitoEnabled, cognitoSocialProviders } from '../config/cognito'
import { beginCognitoSocialLogin } from '../services/cognitoService'

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
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

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

  const handleSocialLogin = async (provider: string) => {
    setError(null)
    setSocialLoading(provider)
    try {
      await beginCognitoSocialLogin(provider)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start sign in.')
      setSocialLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <img
          src={FALLBACK_IMAGE.productDetail}
          alt="Bánh kem chocolate Leaf Creme"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-bg-overlay" />
        <div className="relative flex h-full max-w-xl flex-col justify-between px-12 py-12 text-fg-on-brand xl:px-16">
          <Link to="/" className="font-heading text-3xl leading-none text-fg-on-brand">
            Leaf Creme
          </Link>
          <div>
            <span className="mb-5 inline-flex items-center gap-2 border border-fg-on-brand/30 bg-fg-on-brand/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] backdrop-blur-sm">
              <ShoppingBag size={14} aria-hidden="true" />
              Tiệm bánh thủ công
            </span>
            <h1 className="max-w-md text-5xl leading-tight text-fg-on-brand">Một chút ngọt ngào cho ngày của bạn.</h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-fg-on-brand/80">
              Đăng nhập để theo dõi đơn hàng, lưu những chiếc bánh yêu thích và nhận ưu đãi riêng.
            </p>
          </div>
          <p className="text-xs tracking-wide text-fg-on-brand/65">Leaf Crème · Bánh làm theo từng mẻ nhỏ</p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <Link to="/" className="font-heading text-3xl leading-none text-text-primary lg:hidden">
            Leaf Creme
          </Link>
          <div className="mb-8 mt-12 lg:mt-0">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-accent-brown">Tài khoản của bạn</p>
            <h1 className="mt-3 text-3xl text-text-primary sm:text-4xl">Chào mừng bạn trở lại</h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">Đăng nhập để tiếp tục mua sắm cùng Leaf Creme.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

          {cognitoSocialProviders.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-xs text-text-secondary"><span className="h-px flex-1 bg-border" />Or continue with<span className="h-px flex-1 bg-border" /></div>
              {cognitoSocialProviders.map((provider) => (
                <button key={provider} type="button" onClick={() => handleSocialLogin(provider)} disabled={loading || !!socialLoading} className="w-full rounded-md border border-interactive px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-60">
                  {socialLoading === provider ? 'Redirecting...' : `Continue with ${provider}`}
                </button>
              ))}
            </div>
          )}

          <p className="mt-7 text-center text-sm text-text-secondary">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-accent-brown underline-offset-4 hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
