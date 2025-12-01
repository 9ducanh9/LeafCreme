// Header/Navbar component - simple, slim header pinned to top
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, User as UserIcon, LogOut, Search } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'

export default function Header() {
  const navigate = useNavigate()
  const { cart } = useCart()
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    navigate('/')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    } else {
      navigate('/search')
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      <div className="max-w-[1440px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="font-heading text-2xl font-semibold text-text-primary hover:opacity-80 transition-default"
          >
            Leaf Creme
          </button>
          
          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#menu" className="text-text-secondary hover:text-text-primary transition-default">
              Menu
            </a>
            <a href="#best-sellers" className="text-text-secondary hover:text-text-primary transition-default">
              Best Sellers
            </a>
            <a href="#gift-boxes" className="text-text-secondary hover:text-text-primary transition-default">
              Gift Boxes
            </a>
            <a href="#contact" className="text-text-secondary hover:text-text-primary transition-default">
              Contact
            </a>
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-12 pr-4 py-2 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default text-sm"
              />
            </form>
          </div>
          
          {/* Right side: Search (Mobile), Cart and User */}
          <div className="flex items-center gap-4">
            {/* Search Icon - Mobile */}
            <button
              onClick={() => navigate('/search')}
              className="md:hidden p-2 hover:opacity-70 transition-default"
              aria-label="Tìm kiếm"
            >
              <Search className="w-6 h-6 text-text-primary" />
            </button>
            {/* Cart Icon */}
            <button
              onClick={() => navigate('/cart')}
              className="relative p-2 hover:opacity-70 transition-default"
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className="w-6 h-6 text-text-primary" />
              {cart.itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent-brown text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {cart.itemCount > 99 ? '99+' : cart.itemCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-button border border-border hover:border-accent-brown transition-default"
                >
                  <UserIcon className="w-5 h-5 text-text-primary" />
                  <span className="hidden md:inline text-sm text-text-primary">
                    {user.ho_ten}
                  </span>
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-card shadow-lg z-20">
                      <div className="p-4 border-b border-border">
                        <p className="font-semibold text-text-primary">{user.ho_ten}</p>
                        <p className="text-sm text-text-secondary">{user.email}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            navigate('/profile')
                            setShowUserMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background rounded-button transition-default"
                        >
                          <UserIcon className="w-4 h-4" />
                          Thông tin cá nhân
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background rounded-button transition-default"
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

