// Image constants - organized image paths
// All images are stored in uploads/images/ (served by backend API)

// Get API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Base path for images (served by backend)
export const IMAGES_BASE_PATH = '/uploads/images'

// Helper to get full image URL
function getImageUrl(path: string): string {
  if (path.startsWith('http')) return path
  if (path.startsWith('/uploads')) return `${API_BASE_URL}${path}`
  return `${API_BASE_URL}${IMAGES_BASE_PATH}${path}`
}

// Image paths organized by category
export const IMAGE_PATHS = {
  // Logo
  logo: {
    main: getImageUrl(`${IMAGES_BASE_PATH}/logo/logo.png`),
    navbar: getImageUrl(`${IMAGES_BASE_PATH}/navbar/logo.png`), // Logo specifically for navbar
  },
  
  // Avatars (note: user avatars are in /uploads/avatars/, not /uploads/images/avatar/)
  avatar: {
    default: getImageUrl(`${IMAGES_BASE_PATH}/avatar/default-avatar.png`),
    placeholder: getImageUrl(`${IMAGES_BASE_PATH}/avatar/placeholder.png`),
  },
  
  // Products
  product: {
    placeholder: getImageUrl(`${IMAGES_BASE_PATH}/product/placeholder.png`),
    default: getImageUrl(`${IMAGES_BASE_PATH}/product/default.png`),
  },
  
  // Gift Boxes
  giftBox: {
    placeholder: getImageUrl(`${IMAGES_BASE_PATH}/giftboxes/placeholder.png`),
    default: getImageUrl(`${IMAGES_BASE_PATH}/giftboxes/default.png`),
  },
  
  // Navbar
  navbar: {
    logo: getImageUrl(`${IMAGES_BASE_PATH}/navbar/logo.png`),
  },
} as const

// Fallback images (using external URLs as backup)
export const FALLBACK_IMAGE = {
  product: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80',
  productDetail: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80',
  productSmall: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
  cart: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
  giftBox: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
  giftBoxDetail: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
  logo: IMAGE_PATHS.logo.main,
}

// Gift box image mapping (can be updated to use local images)
export const GIFT_BOX_IMAGES: Record<string, string> = {
  birthday_delight: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
  love_collection: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
  thank_you_box: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
  holiday_special: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
  self_care_box: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
  premium_collection: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
  mini_treats: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
  celebration_box: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
}

// Helper function to get image path with fallback
export function getImagePath(
  category: 'logo' | 'avatar' | 'product' | 'giftBox' | 'navbar',
  type: string = 'default',
  fallback?: string
): string {
  const categoryPaths = IMAGE_PATHS[category]
  if (categoryPaths && type in categoryPaths) {
    return (categoryPaths as any)[type]
  }
  
  // Map category to fallback image
  const fallbackMap: Record<string, string> = {
    logo: FALLBACK_IMAGE.logo,
    avatar: FALLBACK_IMAGE.avatar,
    product: FALLBACK_IMAGE.product,
    giftBox: FALLBACK_IMAGE.giftBox,
    navbar: FALLBACK_IMAGE.logo, // Navbar uses logo fallback
  }
  
  return fallback || fallbackMap[category] || ''
}
