import { useEffect, useState } from 'react'
import { getProducts, Product } from '../../services/productService'
import { Container, ProductGrid, Section, SectionHeader } from '../layout'
import ProductCard from './ProductCard'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'

const BEST_SELLER_PRODUCT_NAMES = [
  'Bánh vanilla trái cây',
  'Bông lan trứng muối phô mai',
  'Mousse matcha phô mai',
  'Tiramisu dâu',
]

export default function BestSellers() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getProducts({ dang_hoat_dong: true, limit: 24 })
      .then((allProducts) => {
        if (!active) return
        const selected = BEST_SELLER_PRODUCT_NAMES.map((name) => {
          const terms = name.toLowerCase().split(/\s+/)
          return allProducts.find((product) => {
            const productName = product.ten.toLowerCase()
            return productName.includes(name.toLowerCase()) || terms.every((term) => productName.includes(term))
          })
        }).filter((product): product is Product => Boolean(product))
        const ids = new Set(selected.map((product) => product.sanpham_id))
        setProducts([...selected, ...allProducts.filter((product) => !ids.has(product.sanpham_id))].slice(0, 4))
      })
      .catch(() => active && setError('Không thể tải các món được yêu thích.'))
      .finally(() => active && setLoading(false))

    return () => { active = false }
  }, [])

  return (
    <Section id="best-sellers" tone="canvas">
      <Container>
        <SectionHeader
          eyebrow="Được yêu thích"
          title="Best sellers"
          description="Bốn món bánh được chọn nhiều nhất từ bếp Leaf Crème."
          align="center"
        />
        {loading && (
          <ProductGrid columns="four">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-product" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            ))}
          </ProductGrid>
        )}
        {!loading && error && (
          <Alert variant="danger" title="Không tải được menu" action={<Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>}>
            {error}
          </Alert>
        )}
        {!loading && !error && products.length === 0 && (
          <EmptyState title="Bếp đang chuẩn bị menu" description="Các món được yêu thích sẽ sớm xuất hiện tại đây." />
        )}
        {!loading && !error && products.length > 0 && (
          <ProductGrid columns="four">
            {products.map((product) => <ProductCard key={product.sanpham_id} product={product} />)}
          </ProductGrid>
        )}
      </Container>
    </Section>
  )
}
