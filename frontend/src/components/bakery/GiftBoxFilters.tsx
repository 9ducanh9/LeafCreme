import { useState } from 'react'
import { GiftBoxOccasion, GiftBoxTag } from '../../types/giftBox'
import Card from '../ui/Card'
import Button from '../ui/Button'

interface GiftBoxFiltersProps {
  onFiltersChange: (filters: { occasion?: GiftBoxOccasion; tag?: GiftBoxTag; minPrice?: number; maxPrice?: number }) => void
}

const OCCASIONS: { value: GiftBoxOccasion; label: string }[] = [
  { value: 'birthday', label: 'Sinh nhật' }, { value: 'thanks', label: 'Cảm ơn' }, { value: 'love', label: 'Tình yêu' },
  { value: 'holiday', label: 'Lễ hội' }, { value: 'self_care', label: 'Chăm sóc bản thân' },
]
const TAGS: { value: GiftBoxTag; label: string }[] = [
  { value: 'limited', label: 'Giới hạn' }, { value: 'best_gift', label: 'Quà tặng tốt nhất' }, { value: 'new', label: 'Mới' },
]

export default function GiftBoxFilters({ onFiltersChange }: GiftBoxFiltersProps) {
  const [occasion, setOccasion] = useState<GiftBoxOccasion | ''>('')
  const [tag, setTag] = useState<GiftBoxTag | ''>('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const emit = (next: { occasion?: GiftBoxOccasion | ''; tag?: GiftBoxTag | ''; minPrice?: string; maxPrice?: string }) => {
    onFiltersChange({
      occasion: next.occasion || undefined,
      tag: next.tag || undefined,
      minPrice: next.minPrice ? Number(next.minPrice) : undefined,
      maxPrice: next.maxPrice ? Number(next.maxPrice) : undefined,
    })
  }
  const fieldClass = 'h-11 w-full rounded-md border border-interactive bg-bg-surface px-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus'
  const active = Boolean(occasion || tag || minPrice || maxPrice)

  const reset = () => {
    setOccasion(''); setTag(''); setMinPrice(''); setMaxPrice(''); onFiltersChange({})
  }

  return (
    <Card className="mb-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto] lg:items-end">
        <div><label htmlFor="gift-occasion" className="mb-2 block text-sm font-medium text-fg">Dịp</label><select id="gift-occasion" value={occasion} onChange={(event) => { const value = event.target.value as GiftBoxOccasion | ''; setOccasion(value); emit({ occasion: value, tag, minPrice, maxPrice }) }} className={fieldClass}><option value="">Tất cả dịp</option>{OCCASIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div><label htmlFor="gift-tag" className="mb-2 block text-sm font-medium text-fg">Nhãn</label><select id="gift-tag" value={tag} onChange={(event) => { const value = event.target.value as GiftBoxTag | ''; setTag(value); emit({ occasion, tag: value, minPrice, maxPrice }) }} className={fieldClass}><option value="">Tất cả nhãn</option>{TAGS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div><label htmlFor="gift-min-price" className="mb-2 block text-sm font-medium text-fg">Giá từ</label><input id="gift-min-price" type="number" min="0" value={minPrice} onChange={(event) => { const value = event.target.value; setMinPrice(value); emit({ occasion, tag, minPrice: value, maxPrice }) }} placeholder="0" className={fieldClass} /></div>
        <div><label htmlFor="gift-max-price" className="mb-2 block text-sm font-medium text-fg">Đến</label><input id="gift-max-price" type="number" min="0" value={maxPrice} onChange={(event) => { const value = event.target.value; setMaxPrice(value); emit({ occasion, tag, minPrice, maxPrice: value }) }} placeholder="Không giới hạn" className={fieldClass} /></div>
        {active && <Button type="button" variant="ghost" onClick={reset}>Xóa bộ lọc</Button>}
      </div>
    </Card>
  )
}
