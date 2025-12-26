// Gift box filters component - filter by occasion, tag, price range
import { useState } from 'react'
import { GiftBoxOccasion, GiftBoxTag } from '../../types/giftBox'

interface GiftBoxFiltersProps {
  onFiltersChange: (filters: {
    occasion?: GiftBoxOccasion
    tag?: GiftBoxTag
    minPrice?: number
    maxPrice?: number
  }) => void
}

const OCCASIONS: { value: GiftBoxOccasion; label: string }[] = [
  { value: 'birthday', label: 'Sinh nhật' },
  { value: 'thanks', label: 'Cảm ơn' },
  { value: 'love', label: 'Tình yêu' },
  { value: 'holiday', label: 'Lễ hội' },
  { value: 'self_care', label: 'Chăm sóc bản thân' },
]

const TAGS: { value: GiftBoxTag; label: string }[] = [
  { value: 'limited', label: 'Giới hạn' },
  { value: 'best_gift', label: 'Quà tặng tốt nhất' },
  { value: 'new', label: 'Mới' },
]

export default function GiftBoxFilters({ onFiltersChange }: GiftBoxFiltersProps) {
  const [occasion, setOccasion] = useState<GiftBoxOccasion | ''>('')
  const [tag, setTag] = useState<GiftBoxTag | ''>('')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  const handleFilterChange = () => {
    onFiltersChange({
      occasion: occasion || undefined,
      tag: tag || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    })
  }

  const handleReset = () => {
    setOccasion('')
    setTag('')
    setMinPrice('')
    setMaxPrice('')
    onFiltersChange({})
  }

  return (
    <div 
      className="mb-8 rounded-2xl p-2.5"
      style={{ 
        backgroundColor: '#FAFAF9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      <div className="flex flex-wrap items-end gap-2.5">
        {/* Occasion Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-text-secondary mb-2">Dịp</label>
          <select
            value={occasion}
            onChange={(e) => {
              setOccasion(e.target.value as GiftBoxOccasion | '')
              setTimeout(handleFilterChange, 0)
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-white text-text-primary text-sm focus:outline-none transition-all duration-200"
            style={{
              border: '1px solid rgba(122, 111, 99, 0.15)',
            }}
            onFocus={(e) => e.target.style.borderColor = '#C59B72'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(122, 111, 99, 0.15)'}
            onMouseEnter={(e) => {
              if (document.activeElement !== e.target) {
                e.currentTarget.style.borderColor = 'rgba(122, 111, 99, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (document.activeElement !== e.target) {
                e.currentTarget.style.borderColor = 'rgba(122, 111, 99, 0.15)'
              }
            }}
          >
            <option value="">Tất cả dịp</option>
            {OCCASIONS.map((occ) => (
              <option key={occ.value} value={occ.value}>
                {occ.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tag Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-text-secondary mb-2">Nhãn</label>
          <select
            value={tag}
            onChange={(e) => {
              setTag(e.target.value as GiftBoxTag | '')
              setTimeout(handleFilterChange, 0)
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-white text-text-primary text-sm focus:outline-none transition-all duration-200"
            style={{
              border: '1px solid rgba(122, 111, 99, 0.15)',
            }}
            onFocus={(e) => e.target.style.borderColor = '#C59B72'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(122, 111, 99, 0.15)'}
            onMouseEnter={(e) => {
              if (document.activeElement !== e.target) {
                e.currentTarget.style.borderColor = 'rgba(122, 111, 99, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (document.activeElement !== e.target) {
                e.currentTarget.style.borderColor = 'rgba(122, 111, 99, 0.15)'
              }
            }}
          >
            <option value="">Tất cả nhãn</option>
            {TAGS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="flex gap-2 items-end">
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-text-secondary mb-2">Giá từ</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value)
                setTimeout(handleFilterChange, 0)
              }}
              placeholder="0"
              className="w-full px-4 py-2.5 rounded-xl bg-white text-text-primary text-sm focus:outline-none transition-all duration-200"
              style={{
                border: '1px solid rgba(122, 111, 99, 0.15)',
              }}
              onFocus={(e) => e.target.style.borderColor = '#C59B72'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(122, 111, 99, 0.15)'}
              onMouseEnter={(e) => {
                if (document.activeElement !== e.target) {
                  e.currentTarget.style.borderColor = 'rgba(122, 111, 99, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (document.activeElement !== e.target) {
                  e.currentTarget.style.borderColor = 'rgba(122, 111, 99, 0.15)'
                }
              }}
            />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-text-secondary mb-2">Đến</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value)
                setTimeout(handleFilterChange, 0)
              }}
              placeholder="Không giới hạn"
              className="w-full px-4 py-2.5 rounded-xl bg-white text-text-primary text-sm focus:outline-none transition-all duration-200"
              style={{
                border: '1px solid rgba(122, 111, 99, 0.15)',
              }}
              onFocus={(e) => e.target.style.borderColor = '#C59B72'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(122, 111, 99, 0.15)'}
              onMouseEnter={(e) => {
                if (document.activeElement !== e.target) {
                  e.currentTarget.style.borderColor = 'rgba(122, 111, 99, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (document.activeElement !== e.target) {
                  e.currentTarget.style.borderColor = 'rgba(122, 111, 99, 0.15)'
                }
              }}
            />
          </div>
        </div>

        {/* Reset Button */}
        {(occasion || tag || minPrice || maxPrice) && (
          <button
            onClick={handleReset}
            className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-accent-brown transition-all duration-200"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>
    </div>
  )
}

