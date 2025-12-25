// Hook for fetching gift boxes list
import { useState, useEffect } from 'react'
import { GiftBox, GiftBoxFilters } from '../types/giftBox'
import { getGiftBoxes } from '../services/giftBoxService'

export function useGiftBoxes(filters?: GiftBoxFilters) {
  const [giftBoxes, setGiftBoxes] = useState<GiftBox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGiftBoxes() {
      setLoading(true)
      setError(null)
      try {
        const data = await getGiftBoxes(filters)
        setGiftBoxes(data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : null
        setError(message || 'Không thể tải danh sách hộp quà')
      } finally {
        setLoading(false)
      }
    }

    fetchGiftBoxes()
  }, [filters])

  return { giftBoxes, loading, error }
}

