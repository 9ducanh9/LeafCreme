import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Candy, Ghost } from 'lucide-react'

export default function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="auth-scene">
      <section className="auth-form-panel" aria-labelledby="auth-title">
        <div className="auth-season-label"><Ghost size={20} aria-hidden="true" /><span>Một chút phép màu, thật nhiều ngọt ngào</span><Candy size={18} aria-hidden="true" /></div>
        <Link to="/" className="auth-brand"><img src="/branding/liceria.png" alt="" />Leaf Creme</Link>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
        <p className="auth-privacy"><Link to="/privacy-policy">Quyền riêng tư</Link><span aria-hidden="true"> · </span><Link to="/">Về cửa hàng</Link></p>
      </section>
    </div>
  )
}
