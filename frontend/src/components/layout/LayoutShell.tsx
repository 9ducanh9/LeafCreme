// LayoutShell - Premium layout wrapper with Header, Main, Footer
// Ensures consistent container width and no visual jump across pages
import { ReactNode } from 'react'
import Header from '../bakery/Header'
import Footer from '../bakery/Footer'

interface LayoutShellProps {
  children: ReactNode
  showFooter?: boolean
}

export default function LayoutShell({ children, showFooter = true }: LayoutShellProps) {
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

