import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'

export function ImageStatusChecker() {
  const [isChecking, setIsChecking] = useState(false)

  const checkAllImages = async () => {
    try {
      setIsChecking(true)
      console.log('Starting image check...')

      // Call PHP script to scan directories
      const response = await fetch('/miniatures/phpscripts/scan-images.php')
      console.log('PHP Response status:', response.status)
      
      const responseText = await response.text()
      console.log('Raw PHP Response:', responseText)
      
      if (!response.ok) {
        throw new Error(`Failed to scan images: ${response.status} ${response.statusText}`)
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error('Failed to parse PHP response:', e)
        throw new Error('Invalid JSON response from scan script')
      }

      console.log('Parsed PHP Response:', data)

      const { success, imageIds } = data
      if (!success || !imageIds) {
        throw new Error('Invalid response from scan script')
      }

      console.log(`Found ${imageIds.length} images`)

      // Update all minis to false first
      console.log('Resetting all minis has_image to false...')
      const resetResult = await supabase
        .from('minis')
        .update({ has_image: false })
        .not('id', 'is', null)
      
      console.log('Reset result:', resetResult)

      // Then update minis with images to true
      if (imageIds.length > 0) {
        console.log('Updating minis with images to true...')
        const updateResult = await supabase
          .from('minis')
          .update({ has_image: true })
          .in('id', imageIds)
        
        console.log('Update result:', updateResult)
      }

      setIsChecking(false)
      console.log('Image check completed successfully')
    } catch (error: any) {
      console.error('Error checking images:', error)
      console.error('Full error details:', {
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause
      })
      setIsChecking(false)
    }
  }

  return (
    <Button
      onClick={checkAllImages}
      disabled={isChecking}
      variant={isChecking ? "btnWarning" : "btnPrimary"}
      className="w-full"
    >
      {isChecking ? 'Checking Images...' : 'Update Image Status'}
    </Button>
  )
} 