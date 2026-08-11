import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { confirmCognitoEmail, resendCognitoConfirmation } from '../services/cognitoService'

const inputClassName = 'w-full rounded-md border border-interactive bg-bg-surface px-4 py-3 text-fg placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow] focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:bg-bg-inset disabled:opacity-70'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await confirmCognitoEmail(email, code)
      navigate(`/login?email=${encodeURIComponent(email)}`, { replace: true })
    } catch (reason: unknown) {
      const detail = reason && typeof reason === 'object' && 'detail' in reason ? (reason as { detail?: unknown }).detail : undefined
      setError(typeof detail === 'string' ? detail : 'The confirmation code is invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setError(null)
    setNotice(null)
    try {
      await resendCognitoConfirmation(email)
      setNotice('A new confirmation code was sent.')
    } catch (reason: unknown) {
      const detail = reason && typeof reason === 'object' && 'detail' in reason ? (reason as { detail?: unknown }).detail : undefined
      setError(typeof detail === 'string' ? detail : 'Unable to resend the confirmation code.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-md">
        <Link to="/" className="font-heading text-3xl text-text-primary">Leaf Creme</Link>
        <p className="mt-12 text-sm font-medium uppercase tracking-[0.15em] text-accent-brown">Email confirmation</p>
        <h1 className="mt-3 text-3xl text-text-primary">Check your inbox</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">Enter the confirmation code sent to your email address.</p>
        <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
          {error && <div role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-4 py-3 text-sm leading-6 text-danger">{error}</div>}
          {notice && <div role="status" className="rounded-md border border-success/30 bg-success-bg px-4 py-3 text-sm leading-6 text-success">{notice}</div>}
          <div><label htmlFor="email" className="mb-2 block text-sm font-medium text-text-primary">Email</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClassName} disabled={loading} /></div>
          <div><label htmlFor="code" className="mb-2 block text-sm font-medium text-text-primary">Confirmation code</label><input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required className={inputClassName} disabled={loading} /></div>
          <Button type="submit" variant="primary" className="w-full py-3.5" disabled={loading}>{loading ? 'Confirming...' : 'Confirm email'}</Button>
        </form>
        <button type="button" onClick={resend} disabled={!email || loading} className="mt-5 w-full text-sm font-semibold text-accent-brown underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60">Resend code</button>
      </section>
    </main>
  )
}
