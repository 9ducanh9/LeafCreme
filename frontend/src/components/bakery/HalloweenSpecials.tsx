import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Container, ProductGrid, Section, SectionHeader } from '../layout'
import Card, { CardBody, CardFooter, CardMedia, CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatPrice } from '../../utils/formatPrice'

const HALLOWEEN_CAKES = [
  {
    slug: 'banh-kem-nhung-tim-dem-hoi',
    name: 'Bánh Kem Nhung Tím Đêm Hội',
    category: 'Bánh kem · Mẻ mới',
    price: 320000,
    image: '/seasonal/halloween-velvet-cake.jpg',
    description:
      'Cốt chocolate ẩm mềm phết kem bơ dâu rừng thủ công, phủ ganache đắng nhẹ cùng quả mọng tươi và mảnh chocolate đen.',
    href: '/categories/Bánh%20kem',
  },
  {
    slug: 'mousse-chocolate-ho-phach',
    name: 'Mousse Chocolate Hổ Phách',
    category: 'Mousse · Mẻ mới',
    price: 265000,
    image: '/seasonal/halloween-amber-mousse.jpg',
    description:
      'Lớp mousse chocolate đen đánh bông xốp nhẹ trên đế bánh quy nghiền, rưới sốt caramel chanh dây vàng óng.',
    href: '/categories/Mousse',
  },
  {
    slug: 'banh-kem-oreo-anh-trang',
    name: 'Bánh Kem Oreo Ánh Trăng',
    category: 'Bánh kem · Mẻ mới',
    price: 280000,
    image: '/seasonal/halloween-oreo-moon.jpg',
    description:
      'Kem tươi trộn vụn bánh Oreo giòn nhẹ, rắc bột cacao nguyên chất và điểm thêm vầng trăng chocolate trắng.',
    href: '/categories/Bánh%20kem',
  },
  {
    slug: 'mousse-viet-quat-dem-thu',
    name: 'Mousse Việt Quất Đêm Thu',
    category: 'Mousse · Mẻ mới',
    price: 240000,
    image: '/seasonal/halloween-berry-mousse.jpg',
    description:
      'Kem phô mai đánh bông mềm mịn quyện cùng sốt quả mọng và việt quất nấu chậm chua dịu, thanh mát.',
    href: '/categories/Mousse',
  },
] as const

export default function HalloweenSpecials() {
  return (
    <Section id="halloween-specials" tone="subtle">
      <Container>
        <SectionHeader
          eyebrow="Mẻ bánh tháng Mười"
          title="Vài món mới cho đêm Halloween"
          description="Bánh làm từng mẻ nhỏ tại bếp với lớp kem phết tay tự nhiên, phục vụ giới hạn đến hết mùa lễ hội."
          align="left"
        />
        <ProductGrid columns="four">
          {HALLOWEEN_CAKES.map((cake) => (
            <Card key={cake.slug} interactive className="halloween-product-card group h-full p-0">
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
        </ProductGrid>
      </Container>
    </Section>
  )
}
