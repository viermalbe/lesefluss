'use client'

import { useEffect, useState, useRef } from 'react'
import { parseNewsletterHtml } from '@/lib/utils/newsletter-parser'
import DOMPurify from 'dompurify'
import './newsletter-viewer.css'
import '@/styles/newsletter-responsive.css'
import { getImageProxyUrl } from '@/lib/utils/image-utils'

export interface NewsletterViewerProps {
  /**
   * Original HTML content of the newsletter
   */
  htmlContent: string
  
  /**
   * Maximum width of the newsletter container (optional)
   * Default: 100%
   */
  maxWidth?: string
  
  /**
   * Whether to preserve original styles (optional)
   * Default: true
   */
  preserveOriginalStyles?: boolean
  
  /**
   * Whether to remove tracking pixels (optional)
   * Default: true
   */
  removeTrackingPixels?: boolean
  
  /**
   * Whether to make images responsive (optional)
   * Default: true
   */
  makeImagesResponsive?: boolean
  
  /**
   * Whether to fix table layouts for better responsive behavior (optional)
   * Default: true
   */
  fixTableLayouts?: boolean
  
  /**
   * Whether to enable dark mode adaptations (optional)
   * Default: true
   */
  enableDarkMode?: boolean
  
  /**
   * Whether to wrap content in a responsive container (optional)
   * Default: true
   */
  wrapInContainer?: boolean
  
  /**
   * Custom CSS class name for the wrapper (optional)
   */
  className?: string
}

/**
 * Newsletter Viewer Component
 * 
 * Renders a newsletter with responsive transformations for better mobile viewing
 * Uses the NewsletterParser to transform HTML content
 */
export function NewsletterViewer({
  htmlContent,
  maxWidth = '100%',
  preserveOriginalStyles = true,
  removeTrackingPixels = true,
  makeImagesResponsive = true,
  fixTableLayouts = true,
  enableDarkMode = true,
  wrapInContainer = true,
  className = ''
}: NewsletterViewerProps) {
  const [transformedContent, setTransformedContent] = useState<string>('')
  const contentRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!htmlContent) {
      setTransformedContent('')
      return
    }
    
    // First sanitize the HTML content with DOMPurify
    const sanitizedContent = DOMPurify.sanitize(htmlContent, {
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    })
    
    // Then transform the sanitized content using the NewsletterParser
    const parsedContent = parseNewsletterHtml(sanitizedContent, {
      preserveOriginalStyles,
      removeTrackingPixels,
      makeImagesResponsive,
      fixTableLayouts,
      enableDarkMode,
      maxWidth
    })
    
    setTransformedContent(parsedContent)
  }, [
    htmlContent, 
    maxWidth, 
    preserveOriginalStyles, 
    removeTrackingPixels, 
    makeImagesResponsive, 
    fixTableLayouts,
    enableDarkMode,
    wrapInContainer
  ])
  
  // Effect to optimize images after content is rendered
  useEffect(() => {
    if (contentRef.current && transformedContent) {
      // Find all images with the newsletter-img class
      const images = contentRef.current.querySelectorAll('img.newsletter-img');
      
      // Replace each image src with the proxy URL
      images.forEach((img) => {
        const originalSrc = img.getAttribute('src');
        if (originalSrc && !originalSrc.includes('/api/image-proxy')) {
          // Only proxy external images
          if (originalSrc.startsWith('http')) {
            // Ensure originalSrc is not null before passing to getImageProxyUrl
            const proxyUrl = getImageProxyUrl(originalSrc || '');
            if (proxyUrl) {
              img.setAttribute('src', proxyUrl);
            }
            
            // Add loading="lazy" for better performance if not already set
            if (!img.getAttribute('loading')) {
              img.setAttribute('loading', 'lazy');
            }
          }
        }
      });
    }
  }, [transformedContent]);

  return (
    <div 
      className={`newsletter-viewer ${className}`}
      style={{
        maxWidth: wrapInContainer ? 'none' : maxWidth,
        margin: '0 auto',
      }}
    >
      {transformedContent ? (
        <div 
          ref={contentRef}
          className="newsletter-content"
          dangerouslySetInnerHTML={{ __html: transformedContent }}
        />
      ) : (
        <div className="newsletter-loading">
          <p>Loading newsletter content...</p>
        </div>
      )}
    </div>
  )
}
