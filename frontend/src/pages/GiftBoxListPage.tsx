// Gift box list page - displays all gift boxes with filters
import { useState } from 'react'
import { useGiftBoxes } from '../hooks/useGiftBoxes'
import GiftBoxCard from '../components/bakery/GiftBoxCard'
import GiftBoxFilters from '../components/bakery/GiftBoxFilters'
import { GiftBoxFilters as GiftBoxFiltersType } from '../types/giftBox'

export default function GiftBoxListPage() {
  const [filters, setFilters] = useState<GiftBoxFiltersType>({})
  const { giftBoxes, loading, error } = useGiftBoxes(filters)

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Filters */}
      <GiftBoxFilters onFiltersChange={setFilters} />

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <p className="text-text-secondary">Đang tải...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-16">
          <p className="text-text-secondary">{error}</p>
        </div>
      )}

      {/* Gift Boxes Grid */}
      {!loading && !error && (
        <>
          {giftBoxes.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-secondary text-lg mb-4">
                Không tìm thấy hộp quà nào phù hợp với bộ lọc của bạn.
              </p>
              <p className="text-text-secondary">
                Vui lòng thử lại với bộ lọc khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {giftBoxes.map((giftBox) => (
                <GiftBoxCard key={giftBox.id} giftBox={giftBox} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

