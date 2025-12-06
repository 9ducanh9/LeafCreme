// Gift box card component for displaying gift boxes in grid
import { useNavigate } from 'react-router-dom'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatPrice } from '../../utils/formatPrice'
import { GiftBox } from '../../types/giftBox'
import { GIFT_BOX_IMAGES, FALLBACK_IMAGE } from '../../constants/images'

interface GiftBoxCardProps {
  giftBox: GiftBox
}

export default function GiftBoxCard({ giftBox }: GiftBoxCardProps) {
  const navigate = useNavigate()

  const getImageUrl = () => {
    if (giftBox.imageUrl) return giftBox.imageUrl
    if (giftBox.imageKey && GIFT_BOX_IMAGES[giftBox.imageKey]) {
      return GIFT_BOX_IMAGES[giftBox.imageKey]
    }
    return FALLBACK_IMAGE.giftBox
  }

  return (
    <Card
      className="flex flex-col hover:scale-[1.01] transition-default cursor-pointer"
      onClick={() => navigate(`/gift-boxes/${giftBox.id}`)}
    > 
      {/* Gift Box Image */}
      <div className="relative mb-4 -mx-6 -mt-6">
        <img
          src={getImageUrl()}
          alt={giftBox.name}
          className="w-full h-64 object-cover rounded-t-card"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = FALLBACK_IMAGE.giftBox
          }}
        />
        {giftBox.tags.length > 0 && (
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {giftBox.tags.map((tag) => (
              <Badge key={tag} className="bg-accent-yellow border border-accent-brown">
                {tag === 'best_gift' ? 'Quà tặng tốt nhất' : tag === 'limited' ? 'Giới hạn' : 'Mới'}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Gift Box Info */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-heading text-lg font-medium text-text-primary mb-1 leading-tight">
          {giftBox.name}
        </h3>
        <p className="text-text-secondary text-sm mb-3">{giftBox.subtitle}</p>
        <p className="text-text-secondary text-sm mb-4 flex-1 line-clamp-2">
          {giftBox.description}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <span className="font-semibold text-lg text-text-primary tracking-tight">
            {formatPrice(giftBox.price)}
          </span>
          <Button
            variant="outline"
            className="text-sm"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/gift-boxes/${giftBox.id}`)
            }}
          >
            Xem chi tiết
          </Button>
        </div>
      </div>
    </Card>
  )
}

