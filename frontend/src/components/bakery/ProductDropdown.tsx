// Product dropdown menu component for navbar
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { getProducts, getProductVariants, Product, ProductVariant } from '../../services/productService'
import { formatPrice } from '../../utils/formatPrice'
import { FALLBACK_IMAGE } from '../../constants/images'
import LoadingSpinner from '../ui/LoadingSpinner'

interface ProductDropdownProps {
  isOpen: boolean
  onClose: () => void
}

const ITEMS_PER_PAGE = 6

export default function ProductDropdown({ isOpen, onClose }: ProductDropdownProps) {
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Record<number, ProductVariant[]>>({})
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLoai, setSelectedLoai] = useState<string>('')
  const [selectedHuongVi, setSelectedHuongVi] = useState<string>('')
  
  // Get unique values for filters
  const [loaiOptions, setLoaiOptions] = useState<string[]>([])
  const [huongViOptions, setHuongViOptions] = useState<string[]>([])

  // Fetch all products and variants
  useEffect(() => {
    async function fetchProducts() {
      if (!isOpen) return
      
      try {
        setLoading(true)
        const data = await getProducts({ 
          dang_hoat_dong: true,
          limit: 1000 
        })
        setProducts(data)
        
        // Extract unique loai values
        const uniqueLoai = Array.from(new Set(data.map(p => p.loai).filter(Boolean)))
        setLoaiOptions(uniqueLoai as string[])
        
        // Fetch variants for products with loai = 'bien_the'
        const bienTheProducts = data.filter(p => p.loai === 'bien_the')
        const variantsMap: Record<number, ProductVariant[]> = {}
        const allHuongVi = new Set<string>()
        
        // Fetch variants for each bien_the product
        await Promise.all(
          bienTheProducts.map(async (product) => {
            try {
              const productVariants = await getProductVariants(product.sanpham_id)
              variantsMap[product.sanpham_id] = productVariants
              productVariants.forEach(v => {
                if (v.huong_vi) {
                  allHuongVi.add(v.huong_vi)
                }
              })
            } catch (error) {
              // Skip if variant fetch fails
            }
          })
        )
        
        setVariants(variantsMap)
        setHuongViOptions(Array.from(allHuongVi).sort())
      } catch (error) {
        // Error handled silently
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [isOpen])

  // Filter products
  useEffect(() => {
    let filtered = [...products]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.ten.toLowerCase().includes(query) ||
        p.mo_ta?.toLowerCase().includes(query) ||
        p.danh_muc?.toLowerCase().includes(query)
      )
    }

    // Filter by loai
    if (selectedLoai) {
      filtered = filtered.filter(p => p.loai === selectedLoai)
    }

    // Filter by huong vi
    if (selectedHuongVi) {
      filtered = filtered.filter(p => {
        if (p.loai !== 'bien_the') return false
        const productVariants = variants[p.sanpham_id] || []
        return productVariants.some(v => v.huong_vi === selectedHuongVi)
      })
    }

    setFilteredProducts(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [products, variants, searchQuery, selectedLoai, selectedHuongVi])

  // Close dropdown when clicking outside or when navigating
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close dropdown when route changes
  useEffect(() => {
    if (isOpen) {
      onClose()
    }
  }, [navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentProducts = filteredProducts.slice(startIndex, endIndex)

  const handleProductClick = (productId: number) => {
    navigate(`/products/${productId}`)
    onClose()
  }

  const handleViewAll = () => {
    navigate('/search')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-card z-50 max-h-[600px] flex flex-col"
    >
      {/* Filters and Search Bar */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Loai Filter */}
          <select
            value={selectedLoai}
            onChange={(e) => setSelectedLoai(e.target.value)}
            className="px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default text-sm min-w-[120px]"
          >
            <option value="">Tất cả loại</option>
            {loaiOptions.map(loai => (
              <option key={loai} value={loai}>
                {loai === 'don' ? 'Đơn' : loai === 'bien_the' ? 'Biến thể' : loai === 'hop_qua' ? 'Hộp quà' : loai}
              </option>
            ))}
          </select>

          {/* Huong Vi Filter */}
          <select
            value={selectedHuongVi}
            onChange={(e) => setSelectedHuongVi(e.target.value)}
            className="px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default text-sm min-w-[120px]"
            disabled={huongViOptions.length === 0}
          >
            <option value="">Tất cả hương vị</option>
            {huongViOptions.map(huongVi => (
              <option key={huongVi} value={huongVi}>
                {huongVi}
              </option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="text-xs text-text-secondary">
          {filteredProducts.length > 0 ? (
            <>Tìm thấy {filteredProducts.length} sản phẩm</>
          ) : (
            <>Không tìm thấy sản phẩm nào</>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="md" />
          </div>
        ) : currentProducts.length === 0 ? (
          <div className="text-center py-16 text-text-secondary">
            Không có sản phẩm nào
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {currentProducts.map((product) => (
              <button
                key={product.sanpham_id}
                onClick={() => handleProductClick(product.sanpham_id)}
                className="text-left p-3 rounded-card border border-border hover:border-accent-brown transition-default hover:bg-background group"
              >
                <div className="relative mb-3 h-32 bg-border rounded-card overflow-hidden">
                  <img
                    src={product.hinh_anh_url || FALLBACK_IMAGE.product}
                    alt={product.ten}
                    className="w-full h-full object-cover group-hover:scale-105 transition-default"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = FALLBACK_IMAGE.product
                    }}
                  />
                </div>
                <h4 className="font-medium text-text-primary text-sm mb-2 line-clamp-2">
                  {product.ten}
                </h4>
                <p className="text-xs text-text-secondary mb-3 line-clamp-1">
                  {product.danh_muc || 'Không phân loại'}
                </p>
                <p className="font-semibold text-accent-brown text-sm">
                  {formatPrice(product.gia_co_ban)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-border flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-button border border-border hover:border-accent-brown transition-default disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Trước
          </button>
          
          <div className="flex items-center gap-3">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-button border transition-default text-sm ${
                  currentPage === page
                    ? 'bg-accent-brown text-white border-accent-brown'
                    : 'border-border hover:border-accent-brown'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-button border border-border hover:border-accent-brown transition-default disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Sau
          </button>
        </div>
      )}

      {/* View All Button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleViewAll}
          className="w-full px-4 py-2 rounded-button border border-accent-brown text-accent-brown hover:bg-accent-brown hover:text-white transition-default text-sm font-medium"
        >
          Xem tất cả sản phẩm
        </button>
      </div>
    </div>
  )
}

