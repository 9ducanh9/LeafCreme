// Leafie Context for global chat state management
import { createContext, useContext, ReactNode } from 'react'
import { useLeafie, UseLeafieReturn } from '../hooks/useLeafie'

const LeafieContext = createContext<UseLeafieReturn | undefined>(undefined)

export function LeafieProvider({ children }: { children: ReactNode }) {
  const leafieState = useLeafie()

  return (
    <LeafieContext.Provider value={leafieState}>
      {children}
    </LeafieContext.Provider>
  )
}

export function useLeafieContext() {
  const context = useContext(LeafieContext)
  if (context === undefined) {
    throw new Error('useLeafieContext must be used within a LeafieProvider')
  }
  return context
}









