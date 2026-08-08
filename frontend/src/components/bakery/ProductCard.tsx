// Product card component for displaying products in grid
import { useNavigate } from 'react-router-dom'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatPrice } from '../../utils/formatPrice'
import { getImageUrl } from '../../utils/getImageUrl'
import { Product } from '../../services/productService'

import { FALLBACK_IMAGE } from '../../constants/images'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate()

  return (
    <Card className="flex flex-col hover-lift cursor-pointer group" onClick={() => navigate(`/products/${product.sanpham_id}`)}>
      {/* Larger photo frame with a subtle zoom on hover. */}
      <div className="relative mb-4 -mx-6 -mt-6 overflow-hidden rounded-t-card">
        <img
          src={product.hinh_anh_url ? getImageUrl(product.hinh_anh_url) : FALLBACK_IMAGE.product}
          alt={product.ten}
          className="w-full h-72 md:h-80 object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = FALLBACK_IMAGE.product
          }}
        />
        {product.danh_muc && (
          <div className="absolute top-4 left-4">
            <Badge>{product.danh_muc}</Badge>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-heading text-lg font-medium text-text-primary mb-2 leading-tight">
          {product.ten}
        </h3>
        <p className="text-text-secondary/80 text-sm mb-3 flex-1 line-clamp-2">
          {product.mo_ta || 'Sản phẩm chất lượng cao từ Leaf Creme.'}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <span className="font-semibold text-lg text-text-primary tracking-tight">
            {formatPrice(Number(product.gia_co_ban))}
          </span>
          <Button
            variant="outline"
            className="text-sm"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/products/${product.sanpham_id}`)
            }}
          >
            Xem chi tiết
          </Button>
        </div>
      </div>
    </Card>
  )
}

