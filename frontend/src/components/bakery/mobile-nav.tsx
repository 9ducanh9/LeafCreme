import type { FormEvent } from 'react'
import { Gift, Leaf, Menu, Search, User, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import type { User as AuthUser } from '../../types/user'
import Button from '../ui/Button'

const navItems = [{ to: '/', label: 'Trang chủ' }, { to: '/search', label: 'Sản phẩm' }, { to: '/gift-boxes', label: 'Hộp quà' }, { to: '/contact', label: 'Liên hệ' }, { to: '/policies', label: 'Chính sách' }]

interface MobileNavProps {
  open: boolean
  user: AuthUser | null
  onClose: () => void
  onSearch: (query: string) => void
}

export function MobileNavTrigger({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  return <button type="button" className="mr-1 grid size-10 place-items-center rounded-md text-fg lg:hidden" aria-label="Mở menu điều hướng" aria-expanded={open} onClick={onOpen}><Menu className="size-5" /></button>
}

export default function MobileNav({ open, user, onClose, onSearch }: MobileNavProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSearch(String(form.get('query') || ''))
  }

  return <>
    <div className={`fixed inset-0 z-overlay bg-bg-overlay transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} aria-hidden="true" onClick={onClose} />
    {/* Drawer: the mobile navigation remains keyboard and screen-reader discoverable. */}
    <aside className={`fixed inset-y-0 left-0 z-modal flex w-[min(88vw,22rem)] flex-col bg-bg-surface shadow-xl transition-transform duration-slower lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`} role="dialog" aria-modal="true" aria-label="Menu điều hướng" aria-hidden={!open}>
      <div className="flex h-16 items-center justify-between border-b border-border-subtle px-5"><span className="font-heading text-xl font-semibold text-fg-strong">Menu</span><button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-md text-fg-muted hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-focus" aria-label="Đóng menu"><X className="size-5" /></button></div>
      <form onSubmit={submit} className="border-b border-border-subtle p-5"><label htmlFor="mobile-search" className="sr-only">Tìm kiếm sản phẩm</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" /><input id="mobile-search" name="query" placeholder="Tìm kiếm sản phẩm" className="h-11 w-full rounded-md border border-interactive bg-bg-surface pl-10 pr-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus" /></div></form>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Điều hướng mobile">{navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium ${isActive ? 'bg-brand-subtle text-brand-fg' : 'text-fg-muted hover:bg-bg-subtle hover:text-fg'}`}>{({ isActive }) => <span aria-current={isActive ? 'page' : undefined} className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-bg-subtle">{item.to === '/' ? <Leaf className="size-4" /> : item.to === '/gift-boxes' ? <Gift className="size-4" /> : item.to === '/search' ? <Search className="size-4" /> : <User className="size-4" />}</span>{item.label}</span>}</NavLink>)}</nav>
      {!user && <div className="grid gap-2 border-t border-border-subtle p-5"><Button href="/login" variant="outline" className="w-full">Đăng nhập</Button><Button href="/register" variant="primary" className="w-full">Tạo tài khoản</Button></div>}
      {user && <div className="border-t border-border-subtle p-5"><Link to="/profile" onClick={onClose} className="flex items-center gap-2 text-sm font-medium text-brand-fg"><User className="size-4" />Tài khoản của tôi</Link></div>}
    </aside>
  </>
}
