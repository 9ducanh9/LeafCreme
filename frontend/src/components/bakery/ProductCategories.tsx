// Product Categories section with 4 main category cards - fetches product counts from API
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../ui/Card'
import { Leaf } from 'lucide-react'
import { getProducts } from '../../services/productService'

interface Category {
  id: number
  name: string
  description: string
  image: string
  danh_muc: string // Backend category name
}

const CATEGORY_DEFINITIONS: Category[] = [
  {
    id: 1,
    name: 'Mousse Cakes',
    description: 'Bánh mousse với lớp kem mịn màng, hương vị thanh nhẹ.',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
    danh_muc: 'Mousse Cakes',
  },
  {
    id: 2,
    name: 'Cheesecakes',
    description: 'Bánh phô mai với vị béo ngậy, kết cấu mịn màng.',
    image: 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=400&q=80',
    danh_muc: 'Cheesecakes',
  },
  {
    id: 3,
    name: 'Crepe Cakes',
    description: 'Bánh crepe nhiều lớp, nhẹ nhàng và tinh tế.',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
    danh_muc: 'Crepe Cakes',
  },
  {
    id: 4,
    name: 'Gift Boxes',
    description: 'Hộp quà tặng với nhiều loại bánh nhỏ xinh.',
    image: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=400&q=80',
    danh_muc: 'Gift Boxes',
  },
]

interface CategoryWithCount extends Category {
  productCount: number
}

export default function ProductCategories() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategoryCounts() {
      try {
        setLoading(true)
        
        // Fetch all active products to count by category
        const allProducts = await getProducts({ 
          dang_hoat_dong: true,
          limit: 1000 
        })
        
        // Map categories with product counts
        const categoriesWithCounts: CategoryWithCount[] = CATEGORY_DEFINITIONS.map((cat) => {
          const count = allProducts.filter(
            (p) => p.danh_muc && p.danh_muc.toLowerCase() === cat.danh_muc.toLowerCase()
          ).length
          
          return {
            ...cat,
            productCount: count,
          }
        })
        
        setCategories(categoriesWithCounts)
      } catch (error) {
        // Fallback to categories without counts
        setCategories(
          CATEGORY_DEFINITIONS.map((cat) => ({ ...cat, productCount: 0 }))
        )
      } finally {
        setLoading(false)
      }
    }

    fetchCategoryCounts()
  }, [])

  return (
    <section className="py-16 bg-surface">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-heading text-4xl font-semibold text-text-primary mb-3">
            Explore our main lines
          </h2>
          <p className="text-text-secondary text-lg">
            Bốn dòng bánh chính từ bếp Leaf Creme.
          </p>
        </div>

        {/* Category Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="cursor-pointer">
                <div className="relative mb-4 -mx-6 -mt-6 h-64 bg-border animate-pulse rounded-t-card" />
                <div className="h-6 bg-border rounded animate-pulse mb-2" />
                <div className="h-4 bg-border rounded animate-pulse" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="cursor-pointer hover:border-accent-brown transition-default hover:scale-[1.01]"
                onClick={() => navigate(`/categories/${encodeURIComponent(category.danh_muc)}`)}
              >
                {/* Category Image */}
                <div className="relative mb-4 -mx-6 -mt-6">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-64 object-cover rounded-t-card"
                  />
                  <div className="absolute top-3 right-3">
                    <Leaf className="w-5 h-5 text-accent-brown opacity-70" />
                  </div>
                </div>

                {/* Category Info */}
                <h3 className="font-heading text-xl font-semibold text-text-primary mb-2">
                  {category.name}
                </h3>
                <p className="text-text-secondary text-sm mb-2">
                  {category.description}
                </p>
                {category.productCount > 0 && (
                  <p className="text-text-secondary text-xs">
                    {category.productCount} sản phẩm
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

