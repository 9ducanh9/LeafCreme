// Header/Navbar component - simple, slim header pinned to top
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, User as UserIcon, LogOut, LayoutDashboard, Leaf } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { useLeafieContext } from '../../contexts/LeafieContext'
import Button from '../ui/Button'
import ProductDropdown from './ProductDropdown'
import { IMAGE_PATHS } from '../../constants/images'

export default function Header() {
  const navigate = useNavigate()
  const { cart, openCartDrawer } = useCart()
  const { user, logout } = useAuth()
  const { openChat } = useLeafieContext()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const avatarButtonRef = useRef<HTMLButtonElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)

  // Reset avatar error when user or avatar_url changes
  useEffect(() => {
    setAvatarError(false)
  }, [user?.avatar_url])

  // Calculate menu position when opening
  useEffect(() => {
    if (showUserMenu && avatarButtonRef.current) {
      const updatePosition = () => {
        if (avatarButtonRef.current) {
          const rect = avatarButtonRef.current.getBoundingClientRect()
          setMenuPosition({
            top: rect.bottom + 8, // 8px = mt-2 equivalent
            right: window.innerWidth - rect.right,
          })
        }
      }
      
      // Calculate immediately
      updatePosition()
      
      // Update position on scroll or resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    } else {
      setMenuPosition(null)
    }
  }, [showUserMenu])

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    navigate('/')
  }

  // Check if user is admin
  const isAdmin = user?.vaitro?.ten_vai_tro?.toLowerCase() === 'admin' || 
                  user?.vaitro?.vaitro_id === 1

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#FFF5E6] via-[#FFFEF9] to-[#FFF5E6] border-b-2 border-[#D4A574] backdrop-blur-sm shadow-sm relative">
      {/* Christmas sparkles decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-2 left-10 text-[#D4A574] text-lg animate-pulse">✨</div>
        <div className="absolute top-3 right-20 text-[#C59B72] text-sm animate-pulse" style={{ animationDelay: '0.5s' }}>❄</div>
        <div className="absolute top-4 left-1/4 text-[#F5C96A] text-xs animate-pulse" style={{ animationDelay: '1s' }}>⭐</div>
      </div>
      
      <div className="max-w-[1440px] mx-auto px-6 py-4 relative z-10">
        {/* Cụm trái: logo + nav, cụm phải: cart + user */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center hover:opacity-80 transition-default"
            aria-label="Leaf Creme - Về trang chủ"
          >
            <img
              src={IMAGE_PATHS.navbar.logo}
              alt="Leaf Creme"
              className="h-8 md:h-10 w-auto object-contain"
              onError={(e) => {
                // Fallback to main logo or text if image not found
                const target = e.target as HTMLImageElement
                const currentSrc = target.src
                if (currentSrc.includes('navbar')) {
                  // Try main logo
                  target.src = IMAGE_PATHS.logo.main
                } else {
                  // Fallback to text
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) {
                    fallback.style.display = 'block'
                  }
                }
              }}
            />
            <span className="font-heading text-xl md:text-2xl font-medium text-text-primary leading-tight hidden">
              Leaf Creme
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 ml-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-text-secondary hover:text-text-primary transition-default"
            >
              Trang chủ
            </button>

            <div className="relative group">
              <button
                type="button"
                onClick={() => navigate('/search')}
                onMouseEnter={() => setShowProductDropdown(true)}
                className="text-text-secondary hover:text-text-primary transition-default"
              >
                Sản phẩm
              </button>
              <div
                onMouseEnter={() => setShowProductDropdown(true)}
                onMouseLeave={() => setShowProductDropdown(false)}
              >
                {showProductDropdown && (
                  <ProductDropdown
                    isOpen={showProductDropdown}
                    onClose={() => setShowProductDropdown(false)}
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/gift-boxes')}
              className="text-text-secondary hover:text-text-primary transition-default"
            >
              Hộp quà
            </button>

            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="text-text-secondary hover:text-text-primary transition-default"
            >
              Liên hệ
            </button>
          </nav>

          {/* Right side: Chatbot, Cart and User (được đẩy sang phải) */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Leafie Chatbot Icon - Christmas style */}
            <button
              onClick={() => openChat()}
              className="relative p-2 hover:opacity-70 transition-default group"
              aria-label="Trò chuyện với Leafie"
            >
              <div className="relative">
                <Leaf className="w-6 h-6 text-[#C59B72] group-hover:text-[#D4A574] transition-default" />
                <span className="absolute -top-1 -right-1 text-[#F5C96A] text-xs animate-pulse">✨</span>
              </div>
            </button>

            {/* Cart Icon */}
            <button
              onClick={openCartDrawer}
              className="relative p-2 hover:opacity-70 transition-default"
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className="w-6 h-6 text-text-primary" />
              {cart.itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-br from-[#C59B72] to-[#D4A574] text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-[#F5C96A]/30">
                  {cart.itemCount > 99 ? '99+' : cart.itemCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  ref={avatarButtonRef}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="relative p-1 hover:opacity-70 transition-default z-10"
                  aria-label="Tài khoản"
                >
                  {user.avatar_url && user.avatar_url.trim() && !avatarError ? (
                    <img
                      src={
                        user.avatar_url.startsWith('http')
                          ? user.avatar_url
                          : `${
                              import.meta.env.VITE_API_BASE_URL ||
                              'http://localhost:8000'
                            }${user.avatar_url}`
                      }
                      alt={user.ho_ten}
                      className="w-10 h-10 rounded-full object-cover border border-border"
                      onError={() => {
                        setAvatarError(true)
                      }}
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-text-primary" />
                  )}
                  {/* Christmas Santa Hat */}
                  <div className="absolute -top-1.5 -left-1" style={{ width: '22px', height: '22px', transform: 'rotate(-25deg)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Hat body */}
                      <path d="M4 16 L12 4 L20 16 Z" fill="#DC2626" stroke="#FFF" strokeWidth="0.5"/>
                      {/* White trim */}
                      <ellipse cx="12" cy="16" rx="8" ry="1.5" fill="#FFF"/>
                      {/* Pom-pom */}
                      <circle cx="12" cy="3" r="2" fill="#FFF"/>
                    </svg>
                  </div>
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-[105]"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div
                      className="fixed w-56 bg-surface border border-border rounded-card shadow-xl z-[110] overflow-hidden"
                      style={menuPosition ? {
                        top: `${menuPosition.top}px`,
                        right: `${menuPosition.right}px`,
                      } : {
                        top: '60px',
                        right: '20px',
                      }}
                    >
                      <div className="p-4 border-b border-border">
                        <p className="font-semibold text-text-primary mb-2">
                          {user.ho_ten}
                        </p>
                        {user.ten_dang_nhap && (
                          <p className="text-xs text-text-secondary mb-2">
                            {user.ten_dang_nhap}
                          </p>
                        )}
                        <p className="text-sm text-text-secondary">
                          {user.email}
                        </p>
                      </div>
                      <div className="py-2">
                        <button
                          onClick={() => {
                            navigate('/profile')
                            setShowUserMenu(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-background transition-default"
                        >
                          <UserIcon className="w-4 h-4" />
                          Thông tin cá nhân
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              navigate('/admin')
                              setShowUserMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-background transition-default"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Admin Panel
                          </button>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-background transition-default"
                        >
                          <LogOut className="w-4 h-4" />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="text-sm"
                >
                  Đăng nhập
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate('/register')}
                  className="text-sm"
                >
                  Đăng ký
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
