// Helper utilities for gift box display
export interface GiftBoxMetadata {
  type: 'gift_box'
  giftMessage?: string
  addCard?: boolean
}

// Parse gift box metadata from variantLabel
export function parseGiftBoxMetadata(variantLabel?: string): GiftBoxMetadata | null {
  if (!variantLabel) return null

  try {
    const metadata = JSON.parse(variantLabel) as GiftBoxMetadata
    if (metadata.type === 'gift_box') {
      return metadata
    }
  } catch {
    // Not JSON or invalid format
  }

  return null
}

