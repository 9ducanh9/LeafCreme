import { Link } from 'react-router-dom'
import Card, { CardBody, CardFooter, CardMedia, CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'
import { formatPrice } from '../../utils/formatPrice'
import { getImageUrl } from '../../utils/getImageUrl'
import { GiftBox } from '../../types/giftBox'
import { GIFT_BOX_IMAGES, FALLBACK_IMAGE } from '../../constants/images'

interface GiftBoxCardProps {
  giftBox: GiftBox
}

export default function GiftBoxCard({ giftBox }: GiftBoxCardProps) {
  const image = giftBox.imageUrl
    ? getImageUrl(giftBox.imageUrl)
    : giftBox.imageKey && GIFT_BOX_IMAGES[giftBox.imageKey]
      ? GIFT_BOX_IMAGES[giftBox.imageKey]
      : FALLBACK_IMAGE.giftBox

  return (
    <Card interactive className="group relative overflow-hidden p-0">
      <CardMedia className="aspect-product">
        <img
          src={image}
          alt={giftBox.name}
          className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
          loading="lazy"
          onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE.giftBox }}
        />
        {giftBox.tags.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {giftBox.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant={tag === 'limited' ? 'warning' : 'brand'}>
                {tag === 'best_gift' ? 'Quà tặng tốt nhất' : tag === 'limited' ? 'Giới hạn' : 'Mới'}
              </Badge>
            ))}
          </div>
        )}
      </CardMedia>
      <CardBody className="gap-2">
        <CardTitle><Link to={`/gift-boxes/${giftBox.id}`} className="outline-none after:absolute after:inset-0 after:z-raised after:content-['']">{giftBox.name}</Link></CardTitle>
        <p className="text-sm text-fg-muted">{giftBox.subtitle}</p>
        <p className="line-clamp-2 text-sm text-fg-muted">{giftBox.description}</p>
      </CardBody>
      <CardFooter className="justify-between">
        <span className="text-lg font-semibold text-fg">{formatPrice(giftBox.price)}</span>
        <span className="text-sm font-semibold text-brand-fg">Xem chi tiết</span>
      </CardFooter>
    </Card>
  )
}
