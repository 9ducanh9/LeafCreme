// Main layout component with Header and Footer for all pages
import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../bakery/Header'
import Footer from '../bakery/Footer'
import { LeafieChatPanel } from '../leafie'
import CartDrawer from '../cart/CartDrawer'
import { useLeafieContext } from '../../contexts/LeafieContext'
import { useCart } from '../../contexts/CartContext'
import { useActiveSeason } from '../../hooks/useActiveSeason'
import FloatingEmojiOverlay from './FloatingEmojiOverlay'

interface MainLayoutProps {
  children: ReactNode
  showFooter?: boolean
}

export default function MainLayout({ children, showFooter = true }: MainLayoutProps) {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  
  // Get Leafie chat state from context (must be called unconditionally for Hooks rules)
  const { isOpen, messages, loading, closeChat, sendMessage, clearHistory } = useLeafieContext()
  const { isCartDrawerOpen, closeCartDrawer } = useCart()
  const activeSeason = useActiveSeason()
  
  // Don't render Header/Footer for admin routes (AdminLayout handles its own layout)
  if (isAdminRoute) {
    return <>{children}</>
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Evergreen by default — only renders when a season in config/seasons.ts matches today. */}
      {activeSeason?.decoration && (
        <FloatingEmojiOverlay emoji={activeSeason.decoration.emoji} color={activeSeason.decoration.color} />
      )}

      <Header />
      <main className="flex-1 relative z-10">
        {children}
      </main>
      {showFooter && <Footer />}
      
      {/* Leafie Chat Panel - available on all pages */}
      <LeafieChatPanel
        isOpen={isOpen}
        messages={messages}
        loading={loading}
        onClose={closeChat}
        onSendMessage={sendMessage}
        onSuggestionSelect={sendMessage}
        onClearHistory={clearHistory}
      />

      {/* Cart Drawer - rendered outside Header to avoid overflow issues */}
      <CartDrawer isOpen={isCartDrawerOpen} onClose={closeCartDrawer} />
    </div>
  )
}

