// Hook for fetching single gift box detail
import { useState, useEffect } from 'react'
import { GiftBox } from '../types/giftBox'
import { getGiftBoxById } from '../services/giftBoxService'

export function useGiftBoxDetail(id: string) {
  const [giftBox, setGiftBox] = useState<GiftBox | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGiftBox() {
      if (!id) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const data = await getGiftBoxById(id)
        setGiftBox(data)
      } catch (err: any) {
        setError(err.message || 'Không thể tải thông tin hộp quà')
      } finally {
        setLoading(false)
      }
    }

    fetchGiftBox()
  }, [id])

  return { giftBox, loading, error }
}

