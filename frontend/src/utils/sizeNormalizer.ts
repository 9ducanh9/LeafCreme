// Size normalization utility
// Chuẩn hóa kich_thuoc từ string tự do thành format chuẩn
// KHÔNG đổi DB, chỉ normalize ở logic layer

/**
 * Mapping từ các format khác nhau sang format chuẩn
 * Format chuẩn: "1 người", "2-3 người", "4-6 người", "7-10 người"
 */
const SIZE_MAP: Record<string, string> = {
  // Format chuẩn (giữ nguyên)
  '1 người': '1 người',
  '2-3 người': '2-3 người',
  '2–3 người': '2-3 người', // Unicode dash
  '4-6 người': '4-6 người',
  '4–6 người': '4-6 người',
  '4-7 người': '4-6 người', // Map 4-7 to 4-6
  '7-10 người': '7-10 người',
  '7–10 người': '7-10 người',
  
  // Size codes (S, M, L, XL)
  'S': '1 người',
  's': '1 người',
  'M': '2-3 người',
  'm': '2-3 người',
  'L': '4-6 người',
  'l': '4-6 người',
  'XL': '7-10 người',
  'xl': '7-10 người',
  'Xl': '7-10 người',
  'xL': '7-10 người',
  
  // Variations
  '1 người ăn': '1 người',
  'cho 1 người': '1 người',
  '2 người': '2-3 người',
  '3 người': '2-3 người',
  '4 người': '4-6 người',
  '5 người': '4-6 người',
  '6 người': '4-6 người',
  '7 người': '7-10 người',
  '8 người': '7-10 người',
  '9 người': '7-10 người',
  '10 người': '7-10 người',
  
  // With diameter
  'S (10cm)': '1 người',
  'M (14cm)': '2-3 người',
  'L (16cm)': '4-6 người',
  'XL (20cm)': '7-10 người',
  'Size S': '1 người',
  'Size M': '2-3 người',
  'Size L': '4-6 người',
  'Size XL': '7-10 người',
}

/**
 * Normalize size string to standard format
 * @param size - Raw size string from database
 * @returns Normalized size string or original if no match found
 */
export function normalizeSize(size: string | null | undefined): string | null {
  if (!size) return null
  
  const trimmed = size.trim()
  if (!trimmed) return null
  
  // Direct lookup
  const normalized = SIZE_MAP[trimmed]
  if (normalized) return normalized
  
  // Case-insensitive lookup
  const lowerNormalized = SIZE_MAP[trimmed.toLowerCase()]
  if (lowerNormalized) return lowerNormalized
  
  // Try to extract number of people
  const peopleMatch = trimmed.match(/(\d+)\s*người/i)
  if (peopleMatch) {
    const people = parseInt(peopleMatch[1], 10)
    if (people === 1) return '1 người'
    if (people >= 2 && people <= 3) return '2-3 người'
    if (people >= 4 && people <= 6) return '4-6 người'
    if (people >= 7 && people <= 10) return '7-10 người'
  }
  
  // If no match, return original (preserve data)
  return trimmed
}

/**
 * Get display label for normalized size
 * @param normalizedSize - Normalized size string
 * @returns Display label with size code
 */
export function getSizeDisplayLabel(normalizedSize: string | null): string {
  if (!normalizedSize) return 'N/A'
  
  const labelMap: Record<string, string> = {
    '1 người': 'S (1 người)',
    '2-3 người': 'M (2-3 người)',
    '4-6 người': 'L (4-6 người)',
    '7-10 người': 'XL (7-10 người)',
  }
  
  return labelMap[normalizedSize] || normalizedSize
}

/**
 * Get size code (S, M, L, XL) from normalized size
 * @param normalizedSize - Normalized size string
 * @returns Size code or null
 */
export function getSizeCode(normalizedSize: string | null): 'S' | 'M' | 'L' | 'XL' | null {
  if (!normalizedSize) return null
  
  const codeMap: Record<string, 'S' | 'M' | 'L' | 'XL'> = {
    '1 người': 'S',
    '2-3 người': 'M',
    '4-6 người': 'L',
    '7-10 người': 'XL',
  }
  
  return codeMap[normalizedSize] || null
}

/**
 * Get people range from normalized size
 * @param normalizedSize - Normalized size string
 * @returns Object with min and max people, or null
 */
export function getPeopleRange(normalizedSize: string | null): { min: number; max: number } | null {
  if (!normalizedSize) return null
  
  const rangeMap: Record<string, { min: number; max: number }> = {
    '1 người': { min: 1, max: 1 },
    '2-3 người': { min: 2, max: 3 },
    '4-6 người': { min: 4, max: 6 },
    '7-10 người': { min: 7, max: 10 },
  }
  
  return rangeMap[normalizedSize] || null
}

/**
 * Check if size matches a specific people count
 * @param normalizedSize - Normalized size string
 * @param people - Number of people
 * @returns True if size is suitable for the number of people
 */
export function isSizeSuitableForPeople(normalizedSize: string | null, people: number): boolean {
  const range = getPeopleRange(normalizedSize)
  if (!range) return false
  return people >= range.min && people <= range.max
}

