import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { completeCognitoOAuthCallback } from '../services/cognitoService'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    let active = true
    if (started.current) return () => { active = false }
    started.current = true
    async function finishLogin() {
      try {
        await completeCognitoOAuthCallback(window.location.search)
        await refreshUser()
        if (active) navigate('/', { replace: true })
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to complete sign in.')
      }
    }
    finishLogin()
    return () => { active = false }
  }, [navigate, refreshUser])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <section className="w-full max-w-md text-center">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-accent-brown">Leaf Creme</p>
        <h1 className="mt-3 text-3xl text-text-primary">Completing sign in</h1>
        {error ? <><p role="alert" className="mt-4 text-sm leading-6 text-danger">{error}</p><Link to="/login" className="mt-6 inline-block font-semibold text-accent-brown underline-offset-4 hover:underline">Back to sign in</Link></> : <p className="mt-4 text-sm text-text-secondary">Please wait.</p>}
      </section>
    </main>
  )
}
