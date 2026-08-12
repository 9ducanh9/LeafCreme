import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LayoutDashboard, Leaf, LogIn, LogOut, Package, ShoppingBag, User } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { useLeafieContext } from '../../contexts/LeafieContext'
import Button from '../ui/Button'
import MobileNav, { MobileNavTrigger } from './mobile-nav'

const navItems = [{ to: '/', label: 'Trang chủ' }, { to: '/search', label: 'Sản phẩm' }, { to: '/gift-boxes', label: 'Hộp quà' }, { to: '/contact', label: 'Liên hệ' }, { to: '/policies', label: 'Chính sách' }]

function navClass({ isActive }: { isActive: boolean }) {
  return `relative py-2 text-sm font-medium transition-colors ${isActive ? 'text-brand-fg after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-brand' : 'text-fg-muted hover:text-fg'}`
}

export default function Header() {
  const { cart, openCartDrawer } = useCart()
  const { user, logout } = useAuth()
  const { openChat } = useLeafieContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [productMenuOpen, setProductMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isAdmin = user?.vaitro?.ten_vai_tro?.toLowerCase() === 'admin' || user?.vaitro?.vaitro_id === 1

  useEffect(() => { setMobileOpen(false); setProductMenuOpen(false); setUserMenuOpen(false) }, [location.pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobileOpen(false); setProductMenuOpen(false); setUserMenuOpen(false) } }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const submitSearch = (query: string) => { const trimmed = query.trim(); navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search'); setMobileOpen(false) }
  const logoutAndGoHome = () => { logout(); setUserMenuOpen(false); navigate('/') }

  return <>
    <header className="sticky top-0 z-header h-20 border-b border-border-subtle bg-bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-20 max-w-container items-center gap-4 px-5 sm:px-8 lg:px-10">
        <MobileNavTrigger open={mobileOpen} onOpen={() => setMobileOpen(true)} />
        <Link to="/" className="flex shrink-0 items-center gap-2 rounded-md" aria-label="Leaf Crème — Trang chủ"><span className="grid size-9 place-items-center rounded-full bg-brand-subtle text-brand-fg"><Leaf className="size-5" /></span><span className="font-heading text-xl font-semibold tracking-tight text-fg-strong">Leaf Crème</span></Link>
        <nav className="ml-10 hidden items-center gap-9 lg:flex" aria-label="Điều hướng chính">{navItems.map((item) => item.to === '/search' ? <div key={item.to} className="relative" ref={productMenuOpen ? undefined : undefined}><button type="button" className={`relative flex items-center gap-1 py-2 text-sm font-medium transition-colors ${location.pathname === '/search' ? 'text-brand-fg' : 'text-fg-muted hover:text-fg'}`} aria-haspopup="true" aria-expanded={productMenuOpen} onClick={() => setProductMenuOpen((open) => !open)}>{item.label}<ChevronDown className={`size-4 transition-transform ${productMenuOpen ? 'rotate-180' : ''}`} /></button>{productMenuOpen && <div className="absolute left-0 top-full z-dropdown mt-2 w-56 rounded-lg border border-border bg-bg-surface p-2 shadow-lg"><Link to="/search" className="block rounded-md px-3 py-2 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg">Tất cả sản phẩm</Link><Link to="/categories/Bánh kem" className="block rounded-md px-3 py-2 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg">Bánh kem</Link><Link to="/categories/Mousse" className="block rounded-md px-3 py-2 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg">Mousse</Link><Link to="/categories/Tiramisu" className="block rounded-md px-3 py-2 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg">Tiramisu</Link></div>}</div> : <NavLink key={item.to} to={item.to} className={navClass} end={item.to === '/'}>{item.label}</NavLink>)}</nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3"><button type="button" onClick={openChat} aria-label="Trò chuyện với Leafie" className="hidden rounded-md p-2 text-fg-muted hover:bg-bg-subtle hover:text-brand-fg sm:grid"><Leaf className="size-5" /></button><button type="button" onClick={openCartDrawer} aria-label={`Giỏ hàng, ${cart.itemCount} sản phẩm`} className="relative grid size-10 place-items-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-brand-fg"><ShoppingBag className="size-5" />{cart.itemCount > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-fg-on-brand">{cart.itemCount > 99 ? '99+' : cart.itemCount}</span>}</button>{user ? <div className="relative" ref={menuRef}><button type="button" onClick={() => setUserMenuOpen((open) => !open)} aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label="Mở menu tài khoản" className="grid size-10 place-items-center rounded-full border border-border-interactive bg-bg-surface text-brand-fg hover:bg-bg-subtle"><User className="size-5" /></button>{userMenuOpen && <div role="menu" className="absolute right-0 top-full z-dropdown mt-2 w-56 overflow-hidden rounded-lg border border-border bg-bg-surface shadow-lg"><div className="border-b border-border-subtle px-4 py-3"><p className="truncate text-sm font-semibold text-fg-strong">{user.ho_ten}</p><p className="truncate text-xs text-fg-subtle">{user.email}</p></div><Link role="menuitem" to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg"><User className="size-4" />Thông tin cá nhân</Link><Link role="menuitem" to="/orders" className="flex items-center gap-3 px-4 py-3 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg"><Package className="size-4" />Đơn hàng của tôi</Link>{isAdmin && <Link role="menuitem" to="/admin" className="flex items-center gap-3 px-4 py-3 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg"><LayoutDashboard className="size-4" />Admin Panel</Link>}<button type="button" role="menuitem" onClick={logoutAndGoHome} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-danger hover:bg-danger-bg"><LogOut className="size-4" />Đăng xuất</button></div>}</div> : <><Link to="/login" className="hidden rounded-md p-2 text-fg-muted hover:bg-bg-subtle hover:text-fg sm:block"><span className="sr-only">Đăng nhập</span><LogIn className="size-5" /></Link><Button href="/login" variant="outline" size="sm" className="hidden sm:inline-flex">Đăng nhập</Button><Button href="/register" variant="primary" size="sm" className="hidden sm:inline-flex">Bắt đầu</Button></>}</div>
      </div>
    </header>
    <MobileNav open={mobileOpen} user={user} onClose={() => setMobileOpen(false)} onSearch={submitSearch} />
  </>
}
