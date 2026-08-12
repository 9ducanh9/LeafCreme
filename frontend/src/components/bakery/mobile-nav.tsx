import { useRef, type FormEvent } from 'react'
import { Gift, Home, Menu, Search, User, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import type { User as AuthUser } from '../../types/user'
import Button from '../ui/Button'
import { useOverlayA11y } from '../../hooks/useOverlayA11y'

const navItems = [
  { to: '/', label: 'Trang chủ', icon: Home },
  { to: '/search', label: 'Sản phẩm', icon: Search },
  { to: '/gift-boxes', label: 'Hộp quà', icon: Gift },
]

interface MobileNavProps {
  open: boolean
  user: AuthUser | null
  onClose: () => void
  onSearch: (query: string) => void
}

export function MobileNavTrigger({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  return <button type="button" className="mr-1 grid size-10 place-items-center rounded-md text-fg lg:hidden" aria-label="Mở menu điều hướng" aria-expanded={open} aria-controls="mobile-nav-drawer" onClick={onOpen}><Menu className="size-5" /></button>
}

export default function MobileNav({ open, user, onClose, onSearch }: MobileNavProps) {
  const drawerRef = useRef<HTMLElement>(null)

  // inert khi đóng + focus trap khi mở + trả focus về nút hamburger.
  // Escape do Header xử lý (nó đóng cả product menu và user menu cùng lúc).
  useOverlayA11y({ containerRef: drawerRef, open })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSearch(String(form.get('query') || ''))
  }

  return <>
    <div className={`fixed inset-0 z-overlay bg-bg-overlay transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} aria-hidden="true" onClick={onClose} />
    {/*
      Drawer giữ trong DOM để còn transition slide-out.
      `invisible` khi đóng là thứ bỏ subtree khỏi tab order ở MỌI browser;
      `inert` (set trong useOverlayA11y) lo phần accessibility tree.
      transition gồm cả `visibility` nên nó chỉ tắt ở CUỐI animation trượt ra.
    */}
    <aside
      ref={drawerRef}
      id="mobile-nav-drawer"
      className={`fixed inset-y-0 left-0 z-modal flex w-[min(88vw,22rem)] flex-col bg-bg-surface shadow-xl transition-[transform,visibility] duration-slow lg:hidden ${open ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Menu điều hướng"
      tabIndex={-1}
    >
      <div className="flex h-16 items-center justify-between border-b border-border-subtle px-5"><span className="font-heading text-xl font-semibold text-fg-strong">Menu</span><button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-md text-fg-muted hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-focus" aria-label="Đóng menu"><X className="size-5" /></button></div>
      <form onSubmit={submit} role="search" className="border-b border-border-subtle p-5"><label htmlFor="mobile-search" className="sr-only">Tìm kiếm sản phẩm</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" /><input id="mobile-search" name="query" placeholder="Tìm kiếm sản phẩm" className="h-11 w-full rounded-md border border-interactive bg-bg-surface pl-10 pr-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus" /></div></form>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Điều hướng mobile">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            // onClick={onClose}: Header đã đóng drawer khi pathname đổi, nhưng chạm
            // vào link của ĐÚNG trang đang xem thì pathname không đổi -> drawer
            // sẽ nằm đè lại và người dùng tưởng chạm không ăn.
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-md px-3 py-3 text-sm font-medium ${isActive ? 'bg-brand-subtle text-brand-fg' : 'text-fg-muted hover:bg-bg-subtle hover:text-fg'}`}
            >
              {({ isActive }) => <span aria-current={isActive ? 'page' : undefined} className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-bg-subtle"><Icon className="size-4" /></span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
      {!user && <div className="grid gap-2 border-t border-border-subtle p-5"><Button href="/login" variant="outline" className="w-full">Đăng nhập</Button><Button href="/register" variant="primary" className="w-full">Tạo tài khoản</Button></div>}
      {user && <div className="border-t border-border-subtle p-5"><Link to="/profile" onClick={onClose} className="flex min-h-11 items-center gap-2 text-sm font-medium text-brand-fg"><User className="size-4" />Tài khoản của tôi</Link></div>}
    </aside>
  </>
}
