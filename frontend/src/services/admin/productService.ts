// Admin Product Service - API calls for product management (using real backend API)
import { parseAdminEntityId, ProductVariant } from '../../types/admin'
import { Product, ProductVariant as BackendVariant } from '../../types/product'
import { apiClient } from '../api'
import { normalizeSize, getSizeDisplayLabel } from '../../utils/sizeNormalizer'
import type { Page } from '../../types/page'

/**
 * Map backend Product + Variant to admin ProductVariant format
 */
function mapToAdminVariant(
  product: Product,
  variant?: BackendVariant
): ProductVariant {
  // If variant exists, use variant data
  if (variant) {
    return {
      id: `variant:${variant.bienthe_id}`,
      productId: product.sanpham_id.toString(),
      name: product.ten,
      flavor: variant.huong_vi || '',
      description: product.mo_ta || '',
      category: product.danh_muc || '',
      price: variant.gia_bienthe,
      size: variant.kich_thuoc || '',
      sizeLabel: getSizeDisplayLabel(normalizeSize(variant.kich_thuoc)),
      status: variant.dang_hoat_dong ? 'active' : 'hidden',
      image: product.hinh_anh_url || '',
      sku: variant.sku_bienthe || product.sku,
      productSku: product.sku,
      shelfLifeDays: product.han_su_dung_ngay ?? null,
    }
  }
  
  // If no variant, use product data (for 'don' type products)
  return {
    id: `product:${product.sanpham_id}`,
    productId: product.sanpham_id.toString(),
    name: product.ten,
    flavor: '',
    description: product.mo_ta || '',
    category: product.danh_muc || '',
    price: product.gia_co_ban,
    size: '',
    sizeLabel: '',
    status: product.dang_hoat_dong ? 'active' : 'hidden',
    image: product.hinh_anh_url || '',
    sku: product.sku,
    productSku: product.sku,
    shelfLifeDays: product.han_su_dung_ngay ?? null,
  }
}

/**
 * Get all product variants for admin panel
 * Fetches products and their variants, then combines them
 */

/**
 * Chuẩn hoá đường dẫn ảnh trước khi gửi lên backend.
 *
 * - URL đầy đủ chứa /uploads/product|giftboxes/... -> lấy phần tương đối
 * - URL ngoài (http...)                            -> giữ nguyên
 * - Đã là đường dẫn tương đối (product/x.jpg)      -> giữ nguyên
 *
 * Trước đây block này lặp nguyên văn 2 lần trong file, và nhánh "URL ngoài" viết
 * `imagePath = imagePath` (no-op, ESLint no-self-assign). Gom về một chỗ để hai
 * nhánh update không thể lệch nhau.
 */
function toRelativeImagePath(image: string | undefined): string | undefined {
  if (!image) return image
  const urlMatch = image.match(/\/uploads\/(product|giftboxes)\/(.+)$/)
  return urlMatch ? `${urlMatch[1]}/${urlMatch[2]}` : image
}

export async function getProductVariants(filters?: {
  category?: string
  size?: string
  search?: string
  skip?: number
  limit?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
  dang_hoat_dong?: boolean
}): Promise<Page<ProductVariant>> {
  try {
    const rows = await apiClient.get<Page<{
      bienthe_id: number | null
      sanpham_id: number
      ten: string
      huong_vi: string | null
      kich_thuoc: string | null
      gia: number
      sku: string | null
      product_sku: string
      han_su_dung_ngay: number | null
      danh_muc: string | null
      mo_ta: string | null
      hinh_anh_url: string | null
      dang_hoat_dong: boolean
    }>>('/products/variants', {
      search: filters?.search || undefined,
      danh_muc: filters?.category || undefined,
      kich_thuoc: filters?.size || undefined,
      dang_hoat_dong: filters?.dang_hoat_dong ?? true,
      skip: filters?.skip ?? 0,
      limit: filters?.limit ?? 50,
      paginated: true,
      sort_by: filters?.sort_by ?? 'ten',
      sort_dir: filters?.sort_dir ?? 'asc',
    })

    return {
      ...rows,
      items: rows.items.map((row) => ({
        id: row.bienthe_id === null ? `product:${row.sanpham_id}` : `variant:${row.bienthe_id}`,
        productId: String(row.sanpham_id),
        name: row.ten,
        flavor: row.huong_vi || '',
        description: row.mo_ta || '',
        category: row.danh_muc || '',
        price: Number(row.gia),
        size: row.kich_thuoc || '',
        sizeLabel: row.kich_thuoc ? getSizeDisplayLabel(normalizeSize(row.kich_thuoc)) : '',
        status: row.dang_hoat_dong ? 'active' : 'hidden',
        image: row.hinh_anh_url || '',
        sku: row.sku || undefined,
        productSku: row.product_sku,
        shelfLifeDays: row.han_su_dung_ngay,
      })),
    }
  } catch (error) {
    console.error('Error fetching product variants:', error)
    throw error
  }
}

/**
 * Get product variant by ID
 */
export async function getProductVariantById(id: string): Promise<ProductVariant> {
  try {
    const parsed = parseAdminEntityId(id)
    if (parsed.kind === 'variant') {
      const variant = await apiClient.get<BackendVariant>(`/products/variants/${parsed.id}`)
      const product = await apiClient.get<Product>(`/products/${variant.sanpham_id}`)
      return mapToAdminVariant(product, variant)
    }
    const product = await apiClient.get<Product>(`/products/${parsed.id}`)
    return mapToAdminVariant(product)
  } catch (error) {
    console.error('Error fetching product variant:', error)
    throw error
  }
}

/**
 * Create product variant
 * This creates both product and variant if needed
 */
export async function createProductVariant(
  data: Omit<ProductVariant, 'id'>
): Promise<ProductVariant> {
  try {
    let product: Product
    const productId = data.productId ? parseInt(data.productId) : NaN
    
    // If productId is provided and valid, try to get existing product
    if (!isNaN(productId)) {
      try {
        product = await apiClient.get<Product>(`/products/${productId}`)
        // Product exists, just create variant
      } catch (error) {
        // Product doesn't exist, create it first
        // Convert full URL back to relative path if needed
        let imagePath = data.image
        if (imagePath) {
          const urlMatch = imagePath.match(/\/uploads\/(product|giftboxes)\/(.+)$/)
          if (urlMatch) {
            imagePath = `${urlMatch[1]}/${urlMatch[2]}`
          }
        }
        
        const variantSku = data.sku?.trim().toUpperCase()
        if (!variantSku) throw new Error('SKU biến thể là bắt buộc')
        const productSku = data.productSku?.trim().toUpperCase() || variantSku.split('-')[0]
        product = await apiClient.post<Product>('/products', {
          ten: data.name,
          sku: productSku,
          loai: 'bien_the',
          gia_co_ban: data.price,
          mo_ta: data.description,
          hinh_anh_url: imagePath || null,
          danh_muc: data.category,
          han_su_dung_ngay: data.shelfLifeDays ?? null,
          dang_hoat_dong: data.status === 'active',
        })
      }
    } else {
      // Create new product
      // Convert full URL back to relative path if needed
      let imagePath = data.image
      if (imagePath) {
        const urlMatch = imagePath.match(/\/uploads\/(product|giftboxes)\/(.+)$/)
        if (urlMatch) {
          imagePath = `${urlMatch[1]}/${urlMatch[2]}`
        }
      }
      
      const variantSku = data.sku?.trim().toUpperCase()
      if (!variantSku) throw new Error('SKU biến thể là bắt buộc')
      const productSku = data.productSku?.trim().toUpperCase() || variantSku.split('-')[0]
      product = await apiClient.post<Product>('/products', {
        ten: data.name,
        sku: productSku,
        loai: 'bien_the',
        gia_co_ban: data.price,
        mo_ta: data.description,
        hinh_anh_url: imagePath || null,
        danh_muc: data.category,
        han_su_dung_ngay: data.shelfLifeDays ?? null,
        dang_hoat_dong: data.status === 'active',
      })
    }

    // For 'bien_the' products, create variant
    if (product.loai === 'bien_the') {
      const variant = await apiClient.post<BackendVariant>('/products/variants', {
        sanpham_id: product.sanpham_id,
        huong_vi: data.flavor,
        kich_thuoc: data.size,
        gia_bienthe: data.price,
        sku_bienthe: data.sku?.trim().toUpperCase(),
        dang_hoat_dong: data.status === 'active',
      })

      // Get updated product and variant to ensure we have latest data
      const updatedProduct = await apiClient.get<Product>(`/products/${product.sanpham_id}`)
      const updatedVariant = await apiClient.get<BackendVariant>(`/products/variants/${variant.bienthe_id}`)
      return mapToAdminVariant(updatedProduct, updatedVariant)
    } else {
      // For 'don' products, return updated product as variant
      const updatedProduct = await apiClient.get<Product>(`/products/${product.sanpham_id}`)
      return mapToAdminVariant(updatedProduct)
    }
  } catch (error) {
    console.error('Error creating product variant:', error)
    throw error
  }
}

/**
 * Update product variant
 */
export async function updateProductVariant(
  id: string,
  data: Partial<ProductVariant>
): Promise<ProductVariant> {
  try {
    const parsed = parseAdminEntityId(id)

    if (parsed.kind === 'variant') {
      // Update variant - only include fields that are provided
      const variantUpdatePayload: Record<string, unknown> = {}
      
      if (data.name !== undefined && data.name !== null && data.name.trim() !== '') {
        variantUpdatePayload.huong_vi = data.flavor
      }
      if (data.size !== undefined && data.size !== null) {
        variantUpdatePayload.kich_thuoc = data.size
      }
      if (data.price !== undefined && data.price !== null && data.price > 0) {
        variantUpdatePayload.gia_bienthe = data.price
      }
      if (data.sku !== undefined && data.sku !== null && data.sku !== '') {
        variantUpdatePayload.sku_bienthe = data.sku
      }
      if (data.status !== undefined) {
        variantUpdatePayload.dang_hoat_dong = data.status === 'active'
      }
      
      const variant = await apiClient.put<BackendVariant>(`/products/variants/${parsed.id}`, variantUpdatePayload)

      // Update product
      const imagePath = toRelativeImagePath(data.image)
      
      // Build update payload - only include fields that are provided
      const productUpdatePayload: Record<string, unknown> = {}
      
      if (data.name !== undefined && data.name !== null && data.name.trim() !== '') {
        productUpdatePayload.ten = data.name
      }
      if (data.description !== undefined && data.description !== null) {
        productUpdatePayload.mo_ta = data.description
      }
      if (imagePath !== undefined && imagePath !== null && imagePath !== '') {
        productUpdatePayload.hinh_anh_url = imagePath
      }
      if (data.category !== undefined && data.category !== null && data.category !== '') {
        productUpdatePayload.danh_muc = data.category
      }
      if (data.shelfLifeDays !== undefined) {
        productUpdatePayload.han_su_dung_ngay = data.shelfLifeDays
      }
      if (data.status !== undefined) {
        productUpdatePayload.dang_hoat_dong = data.status === 'active'
      }
      
      await apiClient.put<Product>(`/products/${variant.sanpham_id}`, productUpdatePayload)

      // Get updated product
      const updatedProduct = await apiClient.get<Product>(`/products/${variant.sanpham_id}`)
      return mapToAdminVariant(updatedProduct, variant)
    }

    if (parsed.kind === 'product') {
      // Get existing product first
      const imagePath = toRelativeImagePath(data.image)
      
      // Build update payload - only include fields that are provided
      const productUpdatePayload: Record<string, unknown> = {}
      
      if (data.name !== undefined && data.name !== null && data.name.trim() !== '') {
        productUpdatePayload.ten = data.name
      }
      if (data.description !== undefined && data.description !== null) {
        productUpdatePayload.mo_ta = data.description
      }
      if (imagePath !== undefined && imagePath !== null && imagePath !== '') {
        productUpdatePayload.hinh_anh_url = imagePath
      }
      if (data.category !== undefined && data.category !== null && data.category !== '') {
        productUpdatePayload.danh_muc = data.category
      }
      if (data.shelfLifeDays !== undefined) {
        productUpdatePayload.han_su_dung_ngay = data.shelfLifeDays
      }
      if (data.price !== undefined && data.price !== null && data.price > 0) {
        productUpdatePayload.gia_co_ban = data.price
      }
      if (data.status !== undefined) {
        productUpdatePayload.dang_hoat_dong = data.status === 'active'
      }
      
      const product = await apiClient.put<Product>(`/products/${parsed.id}`, productUpdatePayload)
      return mapToAdminVariant(product)
    }

    throw new Error('Product variant not found')
  } catch (error) {
    console.error('Error updating product variant:', error)
    throw error
  }
}

/**
 * Delete product variant
 */
export async function deleteProductVariant(id: string): Promise<void> {
  try {
    const parsed = parseAdminEntityId(id)

    if (parsed.kind === 'variant') {
      // Delete variant (soft delete)
      await apiClient.delete(`/products/variants/${parsed.id}`)
      return
    }

    if (parsed.kind === 'product') {
      // Soft delete product
      await apiClient.delete(`/products/${parsed.id}`)
      return
    }

    throw new Error('Product variant not found')
  } catch (error) {
    console.error('Error deleting product variant:', error)
    throw error
  }
}
