import DOMPurify from 'dompurify'
import { transformNewsletterHTML, type TransformOptions } from './newsletter-html-transformer'

/**
 * Sanitizes HTML content for safe rendering in the browser
 * Removes potentially dangerous elements while preserving newsletter formatting
 * Now includes responsive transformation for mobile-friendly display
 */
export function sanitizeHtml(html: string, options?: { transform?: boolean } & TransformOptions): string {
  if (typeof window === 'undefined') {
    // Server-side: return as-is, sanitization happens client-side
    return html
  }

  // Configure DOMPurify to allow common newsletter elements
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'img', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'div', 'span', 'section', 'article', 'header', 'footer'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'width', 'height', 'style', 'target', 'rel'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  }

  // Sanitize the HTML
  let sanitized = DOMPurify.sanitize(html, config)

  // Remove Kill the Newsletter! feed settings text and links
  sanitized = sanitized.replace(
    /Kill the Newsletter!\s*feed settings[^<]*(<[^>]*>[^<]*<\/[^>]*>)*/gi,
    ''
  )
  
  // Remove any remaining Kill the Newsletter references
  sanitized = sanitized.replace(
    /<[^>]*>\s*Kill the Newsletter![^<]*<\/[^>]*>/gi,
    ''
  )
  
  // Remove standalone Kill the Newsletter text
  sanitized = sanitized.replace(
    /Kill the Newsletter!/gi,
    ''
  )

  // Add target="_blank" to all external links
  sanitized = sanitized.replace(
    /<a\s+([^>]*href=["'][^"']*["'][^>]*)>/gi,
    '<a $1 target="_blank" rel="noopener noreferrer">'
  )

  // Apply responsive transformation if requested (default: true)
  const shouldTransform = options?.transform !== false
  if (shouldTransform) {
    sanitized = transformNewsletterHTML(sanitized, options)
  }
  
  return sanitized
}

/**
 * Extracts plain text from HTML content for previews
 */
export function extractTextFromHtml(html: string, maxLength: number = 200): string {
  if (typeof window === 'undefined') {
    // Server-side: simple regex-based extraction
    const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // Client-side: use DOM for accurate text extraction
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })
  const text = tempDiv.textContent || tempDiv.innerText || ''
  
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}
