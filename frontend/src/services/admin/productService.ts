// Admin Product Service - API calls for product management (using real backend API)
import { ProductVariant } from '../../types/admin'
import { Product, ProductVariant as BackendVariant } from '../../types/product'
import { apiClient } from '../api'

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
      id: variant.bienthe_id.toString(),
      productId: product.sanpham_id.toString(),
      name: product.ten,
      description: product.mo_ta || '',
      category: product.danh_muc || '',
      price: variant.gia_bienthe,
      size: (variant.kich_thuoc as 'S' | 'M' | 'L' | 'XL') || 'M',
      status: variant.dang_hoat_dong ? 'active' : 'hidden',
      image: product.hinh_anh_url || '',
      sku: variant.sku_bienthe || product.sku,
    }
  }
  
  // If no variant, use product data (for 'don' type products)
  return {
    id: product.sanpham_id.toString(),
    productId: product.sanpham_id.toString(),
    name: product.ten,
    description: product.mo_ta || '',
    category: product.danh_muc || '',
    price: product.gia_co_ban,
    size: 'M', // Default size for non-variant products
    status: product.dang_hoat_dong ? 'active' : 'hidden',
    image: product.hinh_anh_url || '',
    sku: product.sku,
  }
}

/**
 * Get all product variants for admin panel
 * Fetches products and their variants, then combines them
 */
export async function getProductVariants(filters?: {
  category?: string
  size?: string
  search?: string
}): Promise<ProductVariant[]> {
  try {
    // Fetch all products (including inactive for admin)
    // Don't filter by dang_hoat_dong to show all products in admin panel
    const params: Record<string, any> = {
      limit: 1000, // Get all products
    }
    
    if (filters?.category) {
      params.danh_muc = filters.category
    }
    
    if (filters?.search) {
      params.search = filters.search
    }
    
    // Note: Not filtering by dang_hoat_dong to show all products in admin
    const products = await apiClient.get<Product[]>('/products', params)

    // Fetch variants for each product that has type 'bien_the'
    const variantsMap = new Map<number, BackendVariant[]>()
    
    // Fetch variants in parallel for better performance
    const variantPromises = products
      .filter(p => p.loai === 'bien_the')
      .map(async (product) => {
        try {
          const variants = await apiClient.get<BackendVariant[]>(
            `/products/${product.sanpham_id}/variants`
          )
          variantsMap.set(product.sanpham_id, variants)
        } catch (error) {
          // Product might not have variants yet
          console.warn(`No variants found for product ${product.sanpham_id}`)
          variantsMap.set(product.sanpham_id, [])
        }
      })
    
    await Promise.all(variantPromises)

    // Combine products and variants into admin format
    const adminVariants: ProductVariant[] = []

    for (const product of products) {
      if (product.loai === 'bien_the') {
        // For variant products, create one admin variant per backend variant
        const variants = variantsMap.get(product.sanpham_id) || []
        if (variants.length > 0) {
          for (const variant of variants) {
            const adminVariant = mapToAdminVariant(product, variant)
            
            // Apply size filter
            if (filters?.size && adminVariant.size !== filters.size) {
              continue
            }
            
            adminVariants.push(adminVariant)
          }
        }
        // Note: Don't create placeholder if product has no variants
        // Admin should create variants explicitly
      } else {
        // For non-variant products ('don'), create one admin variant
        const adminVariant = mapToAdminVariant(product)
        if (!filters?.size || adminVariant.size === filters.size) {
          adminVariants.push(adminVariant)
        }
      }
    }

    return adminVariants
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
    // First, try to get as variant ID
    const variantId = parseInt(id)
    if (!isNaN(variantId)) {
      try {
        const variant = await apiClient.get<BackendVariant>(`/products/variants/${variantId}`)
        // Get the product
        const product = await apiClient.get<Product>(`/products/${variant.sanpham_id}`)
        return mapToAdminVariant(product, variant)
      } catch (error) {
        // Not a variant ID, try as product ID
      }
    }

    // Try as product ID
    const productId = parseInt(id)
    if (!isNaN(productId)) {
      const product = await apiClient.get<Product>(`/products/${productId}`)
      return mapToAdminVariant(product)
    }

    throw new Error('Product variant not found')
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
        product = await apiClient.post<Product>('/products', {
          ten: data.name,
          sku: data.sku || `SP-${Date.now()}`,
          loai: 'bien_the',
          gia_co_ban: data.price,
          mo_ta: data.description,
          hinh_anh_url: data.image,
          danh_muc: data.category,
          dang_hoat_dong: data.status === 'active',
        })
      }
    } else {
      // Create new product
      product = await apiClient.post<Product>('/products', {
        ten: data.name,
        sku: data.sku || `SP-${Date.now()}`,
        loai: 'bien_the',
        gia_co_ban: data.price,
        mo_ta: data.description,
        hinh_anh_url: data.image,
        danh_muc: data.category,
        dang_hoat_dong: data.status === 'active',
      })
    }

    // For 'bien_the' products, create variant
    if (product.loai === 'bien_the') {
      const variant = await apiClient.post<BackendVariant>('/products/variants', {
        sanpham_id: product.sanpham_id,
        huong_vi: data.name, // Use product name as flavor
        kich_thuoc: data.size,
        gia_bienthe: data.price,
        sku_bienthe: data.sku || `${product.sku}-${data.size}`,
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
    const variantId = parseInt(id)
    
    if (!isNaN(variantId)) {
      // Update variant
      const variant = await apiClient.put<BackendVariant>(`/products/variants/${variantId}`, {
        huong_vi: data.name,
        kich_thuoc: data.size,
        gia_bienthe: data.price,
        sku_bienthe: data.sku,
        dang_hoat_dong: data.status === 'active',
      })

      // Update product
      const product = await apiClient.get<Product>(`/products/${variant.sanpham_id}`)
      await apiClient.put<Product>(`/products/${variant.sanpham_id}`, {
        ten: data.name || product.ten,
        mo_ta: data.description,
        hinh_anh_url: data.image,
        danh_muc: data.category,
        dang_hoat_dong: data.status === 'active',
      })

      // Get updated product
      const updatedProduct = await apiClient.get<Product>(`/products/${variant.sanpham_id}`)
      return mapToAdminVariant(updatedProduct, variant)
    }

    // If not a variant ID, try as product ID
    const productId = parseInt(id)
    if (!isNaN(productId)) {
      const product = await apiClient.put<Product>(`/products/${productId}`, {
        ten: data.name,
        mo_ta: data.description,
        hinh_anh_url: data.image,
        danh_muc: data.category,
        gia_co_ban: data.price,
        dang_hoat_dong: data.status === 'active',
      })
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
    const variantId = parseInt(id)
    
    if (!isNaN(variantId)) {
      // Delete variant (soft delete)
      await apiClient.delete(`/products/variants/${variantId}`)
      return
    }

    // If not a variant ID, try as product ID
    const productId = parseInt(id)
    if (!isNaN(productId)) {
      // Soft delete product
      await apiClient.delete(`/products/${productId}`)
      return
    }

    throw new Error('Product variant not found')
  } catch (error) {
    console.error('Error deleting product variant:', error)
    throw error
  }
}
