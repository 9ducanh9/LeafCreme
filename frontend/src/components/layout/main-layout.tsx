import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../bakery/Header'
import Footer from '../bakery/Footer'
import { useLeafieContext } from '../../contexts/LeafieContext'
import { useCart } from '../../contexts/CartContext'
import { useRouteAnnouncer } from '../../hooks/useRouteAnnouncer'

interface MainLayoutProps { children: ReactNode; showFooter?: boolean }

const LeafieChatPanel = lazy(() => import('../leafie/LeafieChatPanel'))
const CartDrawer = lazy(() => import('../cart/CartDrawer'))

export default function MainLayout({ children, showFooter = true }: MainLayoutProps) {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const isAdminRoute = location.pathname.startsWith('/admin')
  const { isOpen, messages, loading, closeChat, sendMessage, clearHistory } = useLeafieContext()
  const { isCartDrawerOpen, closeCartDrawer } = useCart()
  const [hasOpenedLeafie, setHasOpenedLeafie] = useState(isOpen)
  const [hasOpenedCart, setHasOpenedCart] = useState(isCartDrawerOpen)
  useRouteAnnouncer()

  useEffect(() => {
    if (isOpen) setHasOpenedLeafie(true)
  }, [isOpen])

  useEffect(() => {
    if (isCartDrawerOpen) setHasOpenedCart(true)
  }, [isCartDrawerOpen])

  useEffect(() => {
    if (isAdminRoute) return
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname, isAdminRoute])

  if (isAdminRoute) return <>{children}</>

  return <div className="flex min-h-screen flex-col bg-bg-canvas">
    <a href="#main-content" className="skip-link">Bỏ qua đến nội dung chính</a>
    <Header />
    <div className="sr-only" aria-live="polite" aria-atomic="true">Đã chuyển đến {location.pathname === '/' ? 'trang chủ' : location.pathname.replace(/\//g, ' ')}</div>
    <main id="main-content" ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 outline-none">{children}</main>
    {showFooter && <Footer />}
    {hasOpenedLeafie && (
      <Suspense fallback={null}>
        <LeafieChatPanel isOpen={isOpen} messages={messages} loading={loading} onClose={closeChat} onSendMessage={sendMessage} onSuggestionSelect={sendMessage} onClearHistory={clearHistory} />
      </Suspense>
    )}
    {hasOpenedCart && (
      <Suspense fallback={null}>
        <CartDrawer isOpen={isCartDrawerOpen} onClose={closeCartDrawer} />
      </Suspense>
    )}
  </div>
}
