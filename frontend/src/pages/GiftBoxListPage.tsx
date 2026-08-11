import { useState } from 'react'
import { useGiftBoxes } from '../hooks/useGiftBoxes'
import GiftBoxCard from '../components/bakery/GiftBoxCard'
import GiftBoxFilters from '../components/bakery/GiftBoxFilters'
import { GiftBoxFilters as GiftBoxFiltersType } from '../types/giftBox'
import { Container, ProductGrid, Section, SectionHeader } from '../components/layout'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Alert from '../components/ui/Alert'

export default function GiftBoxListPage() {
  const [filters, setFilters] = useState<GiftBoxFiltersType>({})
  const { giftBoxes, loading, error } = useGiftBoxes(filters)

  return (
    <Section tone="canvas">
      <Container>
        <SectionHeader eyebrow="Tặng một điều êm ấm" title="Hộp quà Leaf Crème" description="Những set quà được gói sẵn cho các dịp cần một lời nhắn tinh tế." />
        <GiftBoxFilters onFiltersChange={setFilters} />
        {loading && <ProductGrid columns="four">{Array.from({ length: 8 }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="aspect-product" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /></div>)}</ProductGrid>}
        {!loading && error && <Alert variant="danger" title="Không tải được hộp quà">{error}</Alert>}
        {!loading && !error && giftBoxes.length === 0 && <EmptyState title="Chưa có hộp quà phù hợp" description="Thử thay đổi bộ lọc để xem các lựa chọn khác." />}
        {!loading && !error && giftBoxes.length > 0 && <ProductGrid columns="four">{giftBoxes.map((giftBox) => <GiftBoxCard key={giftBox.id} giftBox={giftBox} />)}</ProductGrid>}
      </Container>
    </Section>
  )
}
