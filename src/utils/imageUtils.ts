/**
 * Generates the path for a miniature image based on its ID
 * @param id The miniature ID
 * @param type The type of image (thumb or original)
 * @returns The path to the image
 */
export const getMiniImagePath = (id: number, type: 'thumb' | 'original' = 'original'): string => {
  const idStr = id.toString()
  const x = idStr[0]
  const y = idStr.length > 1 ? idStr[1] : '0'
  return `/images/miniatures/${type}/${x}/${y}/${id}.webp`
} 