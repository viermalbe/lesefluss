interface NewsletterPreviewProps {
  htmlContent: string
  sourceImageUrl?: string | null
  className?: string
}

export function NewsletterPreview({ htmlContent, sourceImageUrl, className = '' }: NewsletterPreviewProps) {
  // Extract first meaningful image from HTML (avoid tracking pixels)
  const getFirstImage = (html: string): string | null => {
    const imgMatches = html.match(/<img[^>]+src="([^"]+)"[^>]*>/gi)
    if (!imgMatches) return null
    
    for (const imgTag of imgMatches) {
      const srcMatch = imgTag.match(/src="([^"]+)"/i)
      if (!srcMatch) continue
      
      const src = srcMatch[1]
      
      // Skip common tracking pixel patterns
      if (
        src.includes('track') ||
        src.includes('pixel') ||
        src.includes('beacon') ||
        src.includes('analytics') ||
        src.includes('1x1') ||
        src.includes('transparent') ||
        src.endsWith('.gif') && src.includes('1bwq5') // WIRED tracking pattern
      ) {
        continue
      }
      
      // Skip very small images (likely tracking)
      const widthMatch = imgTag.match(/width=["']?(\d+)/i)
      const heightMatch = imgTag.match(/height=["']?(\d+)/i)
      if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1])
        const height = parseInt(heightMatch[1])
        if (width < 50 || height < 50) continue
      }
      
      return src
    }
    
    return null
  }

  // Extract clean text preview
  const getTextPreview = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150)
  }

  const firstImage = getFirstImage(htmlContent)
  const textPreview = getTextPreview(htmlContent)
  // Prefer source image over newsletter image to avoid tracking pixels
  const displayImage = sourceImageUrl || firstImage

  return (
    <div className={`bg-gray-50 rounded border border-gray-200 overflow-hidden ${className}`}>
      {displayImage ? (
        <div className="relative w-full h-full">
          <img 
            src={displayImage} 
            alt="Newsletter preview"
            className="w-full h-full object-cover object-top"
            loading="lazy"
            onError={(e) => {
              // Fallback to text preview if image fails
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.innerHTML = `
                  <div class="p-3 h-full flex flex-col justify-start">
                    <div class="text-xs text-gray-700 leading-relaxed">
                      ${textPreview}${textPreview.length >= 150 ? '...' : ''}
                    </div>
                  </div>
                `
              }
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
