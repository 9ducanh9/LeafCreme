import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Container, ProductGrid, Section, SectionHeader } from '../layout'
import Card, { CardBody, CardFooter, CardMedia, CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatPrice } from '../../utils/formatPrice'
import { getImageUrl } from '../../utils/getImageUrl'
import { getProducts, type Product } from '../../services/productService'
import Alert from '../ui/Alert'
import Skeleton from '../ui/Skeleton'

const HALLOWEEN_SKUS = ['HAL01', 'HAL02', 'HAL03', 'HAL04']

export default function HalloweenSpecials() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getProducts({ dang_hoat_dong: true, limit: 200 })
      .then((rows) => {
        if (!active) return
        setProducts(rows.filter((product) => product.dang_hoat_dong && HALLOWEEN_SKUS.includes(product.sku)).sort((a, b) => HALLOWEEN_SKUS.indexOf(a.sku) - HALLOWEEN_SKUS.indexOf(b.sku)))
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])

  if (!loading && !error && products.length === 0) return null
  const cakes = products.map((product) => ({
    id: product.sanpham_id,
    name: product.ten,
    category: `${product.danh_muc || 'Bánh'} · Mẻ mới`,
    price: Number(product.gia_co_ban),
    image: getImageUrl(product.hinh_anh_url),
    description: product.mo_ta || '',
    href: `/products/${product.sanpham_id}`,
  }))

  return (
    <Section id="halloween-specials" tone="subtle">
      <Container>
        <SectionHeader
          eyebrow="Mẻ bánh tháng Mười"
          title="Vài món mới cho đêm Halloween"
          description="Bánh làm từng mẻ nhỏ tại bếp với lớp kem phết tay tự nhiên, phục vụ giới hạn đến hết mùa lễ hội."
          align="left"
        />
        {error && <Alert variant="danger" title="Chưa tải được bánh Halloween" action={<Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Thử lại</Button>}>Bạn thử tải lại để xem danh mục mới nhất nhé.</Alert>}
        {loading && <ProductGrid columns="four">{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="aspect-[4/3]" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /></div>)}</ProductGrid>}
        {!loading && !error && <ProductGrid columns="four">
          {cakes.map((cake) => (
            <Card key={cake.id} interactive className="halloween-product-card group h-full p-0">
              <CardMedia ratio="landscape" className="bg-bg-inset">
                <img
                  src={cake.image}
                  alt={cake.name}
                  width="800"
                  height="600"
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-slow group-hover:scale-[1.02]"
                />
                <div className="absolute left-3 top-3">
                  <Badge variant="brand">{cake.category}</Badge>
                </div>
              </CardMedia>
              <CardBody className="gap-1.5 px-4 pb-4 pt-4 sm:gap-2 sm:px-5 sm:pb-5">
                <CardTitle className="line-clamp-2 text-base sm:text-lg">
                  <Link
                    to={cake.href}
                    className="outline-none after:absolute after:inset-0 after:z-raised after:content-['']"
                  >
                    {cake.name}
                  </Link>
                </CardTitle>
                <p className="line-clamp-2 text-sm text-fg-muted">{cake.description}</p>
              </CardBody>
              <CardFooter className="relative z-sticky mt-auto justify-between gap-2 p-4 sm:gap-3 sm:p-5">
                <span className="font-semibold tabular-nums text-brand-fg">{formatPrice(cake.price)}</span>
                <Button href={cake.href} variant="ghost" size="sm" className="relative z-sticky shrink-0 px-2 sm:px-3">
                  <span className="sm:hidden">Xem</span>
                  <span className="hidden sm:inline">Khám phá</span>
                  <ArrowUpRight className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </ProductGrid>}
      </Container>
    </Section>
  )
}
