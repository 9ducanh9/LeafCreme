// Product card component for displaying products in grid
import { useNavigate } from 'react-router-dom'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatPrice } from '../../utils/formatPrice'
import { Product } from '../../services/productService'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate()

  return (
    <Card className="flex flex-col hover:scale-[1.01] transition-default cursor-pointer" onClick={() => navigate(`/products/${product.sanpham_id}`)}>
      {/* Product Image */}
      <div className="relative mb-4 -mx-6 -mt-6">
        <img
          src={product.hinh_anh_url || FALLBACK_IMAGE}
          alt={product.ten}
          className="w-full h-64 object-cover rounded-t-card"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = FALLBACK_IMAGE
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
        <h3 className="font-heading text-xl font-semibold text-text-primary mb-2">
          {product.ten}
        </h3>
        <p className="text-text-secondary text-sm mb-4 flex-1 line-clamp-2">
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


