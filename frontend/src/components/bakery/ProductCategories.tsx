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
  danh_muc: string 
}

const CATEGORY_DEFINITIONS: Category[] = [
  {
    id: 1,
    name: 'Bánh kem',
    description: 'Cho những khoảnh khắc đáng nhớ, ngọt ngào và ấm áp.',
    image: 'https://img.freepik.com/premium-photo/cake-with-white-chocolate-icing-whipped-cream-strawberries_538646-12060.jpg',
    danh_muc: 'Bánh kem',
  },
  {
    id: 2,
    name: 'Bông lan',
    description: 'Mềm mại, nhẹ nhàng như một cái ôm ấm áp.',
    image: 'https://emvaobep.com/wp-content/uploads/2016/03/cach-lam-banh-bong-lan-pho-mai-ngon.jpg',
    danh_muc: 'Bông lan',
  },
  {
    id: 3,
    name: 'Mousse',
    description: 'Mịn màng, thanh nhẹ cho những phút giây thư giãn.',
    image: 'https://tse3.mm.bing.net/th/id/OIP.ETTQBVy32BL-CCchIwNmpgHaJQ?rs=1&pid=ImgDetMain&o=7&rm=3',
    danh_muc: 'Mousse',
  },
  {
    id: 4,
    name: 'Tiramisu',
    description: 'Cổ điển và đậm đà, như một tách cà phê buổi sáng.',
    image: 'https://th.bing.com/th/id/R.f3e848071ba4d9a47996663b087377f3?rik=Ni5E%2bc4P4TfI5A&pid=ImgRaw&r=0',
    danh_muc: 'Tiramisu',
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
    <section className="py-16 bg-bg-alt">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-medium text-text-primary mb-3 leading-tight">
            Explore our main lines
          </h2>
          <p className="text-text-secondary text-base md:text-lg leading-relaxed">
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
                <h3 className="font-heading text-lg font-medium text-text-primary mb-2 leading-tight">
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

