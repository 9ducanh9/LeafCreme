// Main layout component with Header and Footer for all pages
import { ReactNode } from 'react'
import Header from '../bakery/Header'
import Footer from '../bakery/Footer'

interface MainLayoutProps {
  children: ReactNode
  showFooter?: boolean
}

export default function MainLayout({ children, showFooter = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}

