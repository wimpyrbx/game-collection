/**
 * Generates the path for a miniature image based on its ID
 * @param id The miniature ID
 * @param type The type of image (thumb or original)
 * @returns The path to the image
 */
export function getMiniImagePath(id: number, type: 'thumb' | 'full' | 'original' = 'full') {
  const lastDigits = id.toString().slice(-2)
  const [secondToLast, last] = lastDigits.padStart(2, '0').split('')
  return `/miniatures/images/miniatures/${type}/${secondToLast}/${last}/${id}.webp`
}

export function getCompanyLogoPath(companyName: string | undefined | null): string {
  if (!companyName) return '';
  return `/miniatures/images/product_companies/${companyName.toLowerCase()}.webp`;
} 