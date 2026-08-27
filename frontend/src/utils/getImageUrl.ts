/**
 * Helper function to get full image URL from relative path
 * Handles both local paths (uploads/product/...) and external URLs
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function getImageUrl(path: string | null | undefined): string {
  // Return fallback if no path
  if (!path) {
    return ''
  }

  // If already a full URL (http/https), return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // API resources such as database-backed avatars can live outside /uploads.
  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`
  }

  // If path is relative (product/xxx.jpg or giftboxes/xxx.jpg), add /uploads/
  if (path.startsWith('product/') || path.startsWith('giftboxes/')) {
    return `${API_BASE_URL}/uploads/${path}`
  }

  // Default: assume it's relative to /uploads
  return `${API_BASE_URL}/uploads/${path}`
}

