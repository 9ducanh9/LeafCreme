// Build complete context bundle for Leafie AI assistant
// Leafie needs ALL data to provide accurate recommendations
import { getProducts, getProductVariants } from '../services/productService'
import { getGiftBoxes } from '../services/giftBoxService'
import { getVouchers } from '../services/admin/voucherService'
import type { LeafieContextBase } from '../types/leafie'
import type { Product } from '../types/product'

/**
 * Build complete context bundle for Leafie (without sessionId)
 * sessionId is added by useLeafie hook based on user state
 * Includes ALL products, variants count, categories, gift boxes, and vouchers
 */
export async function buildLeafieContext(): Promise<LeafieContextBase> {
  try {
    // Fetch ALL active products (not limited)
    const allProducts = await getProducts({
      dang_hoat_dong: true,
      limit: 100, // Keep the assistant request bounded; the API default is paginated.
    })

    // Count variants for each product
    let totalVariants = 0
    const productsWithVariants = await Promise.all(
      allProducts.map(async (p: Product) => {
        let variantCount = 0
        if (p.loai === 'bien_the') {
          try {
            const variants = await getProductVariants(p.sanpham_id)
            variantCount = variants.length
            totalVariants += variantCount
          } catch (error) {
            // Product might not have variants yet
            variantCount = 0
          }
        } else {
          // For 'don' type, count as 1 variant
          totalVariants += 1
          variantCount = 1
        }

        return {
          id: p.sanpham_id,
          name: p.ten,
          price: p.gia_co_ban,
          category: p.danh_muc,
          type: p.loai,
          description: p.mo_ta || '', // Ensure description is always a string
          variantCount,
          phu_hop_dip: p.phu_hop_dip || undefined, // Danh sách dịp phù hợp
        }
      })
    )

    // Extract unique categories with product count
    const categoryMap = new Map<string, number>()
    allProducts.forEach((p) => {
      if (p.danh_muc) {
        categoryMap.set(p.danh_muc, (categoryMap.get(p.danh_muc) || 0) + 1)
      }
    })

    const categories = Array.from(categoryMap.entries()).map(([name, count], index) => ({
      id: index + 1,
      name,
      productCount: count,
    }))

    // Detailed size guide with diameter
    const sizeGuide = [
      { size: 'S', diameter: '10cm', peopleMin: 1, peopleMax: 2, recommendedSize: 'Size S (10cm)' },
      { size: 'M', diameter: '14cm', peopleMin: 3, peopleMax: 4, recommendedSize: 'Size M (14cm)' },
      { size: 'L', diameter: '16cm', peopleMin: 4, peopleMax: 7, recommendedSize: 'Size L (16cm)' },
      { size: 'XL', diameter: '20cm', peopleMin: 7, peopleMax: 10, recommendedSize: 'Size XL (20cm)' },
    ]

    // Fetch ALL gift boxes
    let giftBoxes: LeafieContextBase['giftBoxes'] = []
    try {
      const allGiftBoxes = await getGiftBoxes({})
      giftBoxes = allGiftBoxes.map((box) => ({
        id: parseInt(box.id) || 0,
        name: box.name,
        price: box.price,
        description: box.description,
        occasions: box.occasions || [],
      }))
    } catch (error) {
      console.warn('Could not fetch gift boxes for Leafie context:', error)
    }

    // Fetch ALL active vouchers
    let vouchers: LeafieContextBase['vouchers'] = []
    try {
      const activeVouchers = await getVouchers({ status: 'active' })
      vouchers = activeVouchers.map((v) => ({
        code: v.code,
        type: v.type,
        value: v.discountValue,
        appliesTo: v.appliesTo,
        minOrderValue: v.minOrderValue,
        expiresAt: v.expiresAt,
      }))
    } catch (error) {
      console.warn('Could not fetch vouchers for Leafie context:', error)
    }

    return {
      allProducts: productsWithVariants,
      stats: {
        totalProducts: allProducts.length,
        totalVariants,
        totalCategories: categories.length,
        totalGiftBoxes: giftBoxes.length,
        totalVouchers: vouchers.length,
      },
      categories,
      sizeGuide,
      giftBoxes,
      vouchers,
    }
  } catch (error) {
    console.error('Error building Leafie context:', error)
    // Return minimal fallback context
    return {
      allProducts: [],
      stats: {
        totalProducts: 0,
        totalVariants: 0,
        totalCategories: 0,
        totalGiftBoxes: 0,
        totalVouchers: 0,
      },
      categories: [],
      sizeGuide: [
        { size: 'S', diameter: '10cm', peopleMin: 1, peopleMax: 2, recommendedSize: 'Size S (10cm)' },
        { size: 'M', diameter: '14cm', peopleMin: 3, peopleMax: 4, recommendedSize: 'Size M (14cm)' },
        { size: 'L', diameter: '16cm', peopleMin: 4, peopleMax: 7, recommendedSize: 'Size L (16cm)' },
        { size: 'XL', diameter: '20cm', peopleMin: 7, peopleMax: 10, recommendedSize: 'Size XL (20cm)' },
      ],
    }
  }
}

