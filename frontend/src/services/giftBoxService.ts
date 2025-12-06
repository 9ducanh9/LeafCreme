// Gift Box service - API-first with fallback to static data
import { apiClient } from './api'
import { GiftBox, GiftBoxFilters } from '../types/giftBox'
import { FALLBACK_GIFT_BOXES } from '../data/giftBoxes'

export async function getGiftBoxes(filters?: GiftBoxFilters): Promise<GiftBox[]> {
  try {
    // Try API first
    const response = await apiClient.get('/gift-boxes', { params: filters })
    if (response.data && Array.isArray(response.data)) {
      return response.data
    }
  } catch (error: any) {
    // If API fails (404, 500, or not implemented), fallback to static data
    if (error.response?.status === 404 || error.response?.status === 500 || !error.response) {
      console.log('Gift boxes API not available, using fallback data')
    } else {
      throw error
    }
  }

  // Fallback to static data with client-side filtering
  let filtered = [...FALLBACK_GIFT_BOXES]

  if (filters?.occasion) {
    filtered = filtered.filter((box) => box.occasions.includes(filters.occasion!))
  }

  if (filters?.tag) {
    filtered = filtered.filter((box) => box.tags.includes(filters.tag!))
  }

  if (filters?.minPrice !== undefined) {
    filtered = filtered.filter((box) => box.price >= filters.minPrice!)
  }

  if (filters?.maxPrice !== undefined) {
    filtered = filtered.filter((box) => box.price <= filters.maxPrice!)
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(
      (box) =>
        box.name.toLowerCase().includes(searchLower) ||
        box.subtitle.toLowerCase().includes(searchLower) ||
        box.description.toLowerCase().includes(searchLower)
    )
  }

  // Only return active boxes
  return filtered.filter((box) => box.status === 'active')
}

export async function getGiftBoxById(id: string): Promise<GiftBox> {
  try {
    // Try API first
    const response = await apiClient.get(`/gift-boxes/${id}`)
    if (response.data) {
      return response.data
    }
  } catch (error: any) {
    // If API fails, fallback to static data
    if (error.response?.status === 404 || error.response?.status === 500 || !error.response) {
      console.log('Gift box API not available, using fallback data')
    } else {
      throw error
    }
  }

  // Fallback to static data
  const giftBox = FALLBACK_GIFT_BOXES.find((box) => box.id === id)
  if (!giftBox) {
    throw new Error('Gift box not found')
  }

  return giftBox
}

