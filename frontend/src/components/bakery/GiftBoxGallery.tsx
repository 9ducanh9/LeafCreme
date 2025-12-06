// Gift box image gallery component
import { FALLBACK_IMAGE, GIFT_BOX_IMAGES } from '../../constants/images'
import { GiftBox } from '../../types/giftBox'

interface GiftBoxGalleryProps {
  giftBox: GiftBox
}

export default function GiftBoxGallery({ giftBox }: GiftBoxGalleryProps) {
  const getImageUrl = () => {
    if (giftBox.imageUrl) return giftBox.imageUrl
    if (giftBox.imageKey && GIFT_BOX_IMAGES[giftBox.imageKey]) {
      return GIFT_BOX_IMAGES[giftBox.imageKey]
    }
    return FALLBACK_IMAGE.giftBoxDetail
  }

  return (
    <div className="w-full">
      <img
        src={getImageUrl()}
        alt={giftBox.name}
        className="w-full h-[280px] sm:h-[320px] md:h-[450px] object-cover rounded-xl border border-border"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = FALLBACK_IMAGE.giftBoxDetail
        }}
      />
    </div>
  )
}

