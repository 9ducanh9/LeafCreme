import { useEffect, useState } from 'react'
import { getBestSellers, Product } from '../../services/productService'
import { Container, ProductGrid, Section, SectionHeader } from '../layout'
import ProductCard from './ProductCard'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'

export default function BestSellers() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getBestSellers(4)
      .then((bestSellers) => {
        if (!active) return
        setProducts(bestSellers)
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
          description="Bốn món bánh được chọn nhiều nhất từ bếp Leaf Creme."
          align="center"
        />
        {loading && (
          <ProductGrid columns="four">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-[4/3]" />
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
