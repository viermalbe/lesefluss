import { OptimizedImage } from '@/components/ui/optimized-image'

interface NewsletterPreviewProps {
  htmlContent: string
  sourceImageUrl?: string | null
  className?: string
}

export function NewsletterPreview({ htmlContent, sourceImageUrl, className = '' }: NewsletterPreviewProps) {
  // Wir extrahieren keine Bilder mehr aus dem HTML-Inhalt, um falsche Bilder zu vermeiden

  // Extract clean text preview
  const getTextPreview = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150)
  }

  const textPreview = getTextPreview(htmlContent)
  // Verwende ausschließlich das Quellbild, um falsche Bilder zu vermeiden
  const displayImage = sourceImageUrl

  return (
    <div className={`bg-gray-50 rounded border border-gray-200 overflow-hidden ${className}`}>
      {displayImage ? (
        <div className="relative w-full h-full">
          <OptimizedImage 
            src={displayImage}
            alt="Newsletter preview"
            className="w-full h-full object-contain bg-white"
            onError={() => {
              // Fallback handled by OptimizedImage component
            }}
          />
        </div>
      ) : (
        <div className="p-3 h-full flex flex-col justify-start">
          <div className="text-xs text-gray-700 leading-relaxed">
            {textPreview}{textPreview.length >= 150 ? '...' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
