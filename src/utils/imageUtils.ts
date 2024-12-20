/**
 * Generates the path for a miniature image based on its ID
 * @param id The miniature ID
 * @param type The type of image (thumb or original)
 * @returns The path to the image
 */
export function getMiniImagePath(id: number, type: 'thumb' | 'full' | 'original' = 'full') {
  // Convert ID to string and pad with leading zeros if needed
  const idStr = id.toString()
  // First digit is always the first character
  const firstDigit = idStr[0]
  // Second digit is the second character or '0' if not present
  const secondDigit = idStr.length > 1 ? idStr[1] : '0'
  const timestamp = new Date().getTime()
  return `/miniatures/images/miniatures/${type}/${firstDigit}/${secondDigit}/${id}.webp?t=${timestamp}`
}

export function getCompanyLogoPath(companyName: string | undefined | null): string {
  if (!companyName) return '';
  return `/miniatures/images/product_companies/${companyName.toLowerCase()}.webp`;
} 