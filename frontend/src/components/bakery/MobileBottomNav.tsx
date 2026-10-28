import { NavLink } from 'react-router-dom'
import { Gift, Home, MessageCircle, Search, ShoppingBag } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useLeafieContext } from '../../contexts/LeafieContext'

const links = [
  { to: '/', label: 'Trang chủ', Icon: Home },
  { to: '/search', label: 'Tìm bánh', Icon: Search },
  { to: '/gift-boxes', label: 'Hộp quà', Icon: Gift },
  { to: '/contact', label: 'Liên hệ', Icon: MessageCircle },
]

export default function MobileBottomNav() {
  const { cart, openCartDrawer, isCartDrawerOpen } = useCart()
  const { openChat, isOpen } = useLeafieContext()
  return <nav className="mobile-bottom-nav" aria-label="Điều hướng điện thoại">
    {links.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `mobile-bottom-nav-item ${isActive && !isOpen && !isCartDrawerOpen ? 'is-active' : ''}`}>
      <span className="mobile-bottom-nav-icon"><Icon size={20} aria-hidden="true" /></span><span>{label}</span>
    </NavLink>)}
    <button type="button" className={`mobile-bottom-nav-item ${isCartDrawerOpen ? 'is-active' : ''}`} onClick={openCartDrawer} aria-label={`Giỏ hàng, ${cart.itemCount} sản phẩm`} aria-haspopup="dialog" aria-expanded={isCartDrawerOpen}>
      <span className="mobile-bottom-nav-icon"><ShoppingBag size={20} aria-hidden="true" />{cart.itemCount > 0 && <span className="mobile-cart-count">{cart.itemCount > 99 ? '99+' : cart.itemCount}</span>}</span><span>Giỏ hàng</span>
    </button>
    <button type="button" className={`mobile-bottom-nav-item ${isOpen ? 'is-active' : ''}`} onClick={openChat} aria-label="Mở Leafie" aria-haspopup="dialog" aria-expanded={isOpen}>
      <span className="mobile-bottom-nav-icon mobile-leafie-icon"><img src="/branding/leafie-ghost.png" alt="" aria-hidden="true" width="32" height="32" /></span><span>Leafie</span>
    </button>
  </nav>
}
