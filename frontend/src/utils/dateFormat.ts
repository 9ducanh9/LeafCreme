// Date format utilities for Vietnamese format (DD/MM/YYYY)

/**
 * Convert date from YYYY-MM-DD (HTML input format) to DD/MM/YYYY (display format)
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Convert date from DD/MM/YYYY (display format) to YYYY-MM-DD (HTML input format)
 */
export function formatDateForInput(dateString: string): string {
  if (!dateString) return ''
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }
  
  // Convert DD/MM/YYYY to YYYY-MM-DD
  const [day, month, year] = dateString.split('/')
  return `${year}-${month}-${day}`
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayForInput(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

