// Gift box image gallery component
import { getImageUrl } from '../../utils/getImageUrl'
import { FALLBACK_IMAGE, GIFT_BOX_IMAGES } from '../../constants/images'
import { GiftBox } from '../../types/giftBox'

interface GiftBoxGalleryProps {
  giftBox: GiftBox
}

export default function GiftBoxGallery({ giftBox }: GiftBoxGalleryProps) {
  const getImageUrlForGiftBox = () => {
    if (giftBox.imageUrl) return getImageUrl(giftBox.imageUrl)
    if (giftBox.imageKey && GIFT_BOX_IMAGES[giftBox.imageKey]) {
      return GIFT_BOX_IMAGES[giftBox.imageKey]
    }
    return FALLBACK_IMAGE.giftBoxDetail
  }

  return (
    <div className="w-full h-full">
      <img
        src={getImageUrlForGiftBox()}
        alt={giftBox.name}
        className="w-full h-full object-cover rounded-xl border border-border"
        style={{ maxHeight: '75vh' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = FALLBACK_IMAGE.giftBoxDetail
        }}
      />
    </div>
  )
}

