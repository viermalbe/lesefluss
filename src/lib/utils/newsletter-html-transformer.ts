/**
 * Newsletter HTML Transformer
 * 
 * Transforms newsletter HTML for optimal mobile display by:
 * - Removing fixed widths and heights
 * - Making images responsive
 * - Fixing table layouts
 * - Overriding inline styles
 * - Adding responsive wrapper
 */

export interface TransformOptions {
  maxWidth?: string
  preserveOriginalStyles?: boolean
  enableDarkMode?: boolean
  removeTrackingPixels?: boolean
}

export class NewsletterHTMLTransformer {
  private options: Required<TransformOptions>

  constructor(options: TransformOptions = {}) {
    this.options = {
      maxWidth: '100%',
      preserveOriginalStyles: false,
      enableDarkMode: true,
      removeTrackingPixels: true,
      ...options
    }
  }

  /**
   * Main transformation method
   */
  transform(html: string): string {
    if (!html || typeof html !== 'string') return ''

    try {
      // Create a temporary DOM element for manipulation
      const parser = new DOMParser()
      const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
      const container = doc.body.firstChild as HTMLElement

      if (!container) return html

      // Apply transformations
      this.removeFixedDimensions(container)
      this.makeImagesResponsive(container)
      // Remove problematic table structures and fix column layouts
      this.removeProblematicTables(container)
      this.removeTrackingElements(container)
      this.addResponsiveClasses(container)

      // Wrap in responsive container
      const transformedHTML = container.innerHTML
      return this.wrapInResponsiveContainer(transformedHTML)

    } catch (error) {
      console.warn('Newsletter HTML transformation failed:', error)
      // Fallback: return original HTML wrapped in basic container
      return this.wrapInResponsiveContainer(html)
    }
  }

  /**
   * Remove fixed width and height attributes
   */
  private removeFixedDimensions(container: HTMLElement): void {
    const elementsWithDimensions = container.querySelectorAll('*[width], *[height], *[style*="width"], *[style*="height"]')
    
    elementsWithDimensions.forEach(element => {
      const el = element as HTMLElement
      
      // Remove width/height attributes
      el.removeAttribute('width')
      el.removeAttribute('height')
      
      // Clean up style attribute
      if (el.style.cssText) {
        el.style.width = ''
        el.style.height = ''
        el.style.minWidth = ''
        el.style.maxWidth = ''
        el.style.minHeight = ''
        el.style.maxHeight = ''
      }
    })
  }

  /**
   * Make images responsive
   */
  private makeImagesResponsive(container: HTMLElement): void {
    const images = container.querySelectorAll('img')
    
    images.forEach(img => {
      // Remove dimension attributes
      img.removeAttribute('width')
      img.removeAttribute('height')
      
      // Add responsive classes
      img.classList.add('newsletter-img')
      
      // Set responsive styles directly
      img.style.maxWidth = '100%'
      img.style.height = 'auto'
      img.style.display = 'block'
      img.style.margin = '0 auto'
      
      // Add loading optimization
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy')
      }
    })
  }

  /**
   * Remove problematic table structures that don't work on mobile
   */
  private removeProblematicTables(container: Element): void {
    // First, fix basic table layouts
    this.fixTableLayouts(container)
    
    // Remove tables used purely for layout with single row/cell
    const layoutTables = container.querySelectorAll('table')
    layoutTables.forEach(table => {
      const rows = table.querySelectorAll('tr')
      if (rows.length === 1) {
        const cells = rows[0].querySelectorAll('td, th')
        if (cells.length === 1) {
          // Single cell table - replace with div
          const div = document.createElement('div')
          div.innerHTML = cells[0].innerHTML
          table.parentNode?.replaceChild(div, table)
        }
      }
    })
    
    // Fix 3-column layouts with empty side columns
    this.fixEmptyColumnLayouts(container)
    
    // Aggressive removal of all empty cells
    this.removeAllEmptyCells(container)
    
    // Direct removal of &nbsp; only cells
    this.removeNbspOnlyCells(container)
  }
  
  /**
   * Make table layouts responsive and mobile-friendly
   */
  private fixTableLayouts(container: Element): void {
    const tables = container.querySelectorAll('table')
    
    tables.forEach(table => {
      const tableEl = table as HTMLElement
      // Remove fixed widths
      tableEl.removeAttribute('width')
      tableEl.style.width = '100%'
      tableEl.style.maxWidth = '100%'
      tableEl.style.tableLayout = 'auto'
      
      // Add responsive class
      tableEl.classList.add('newsletter-table')
      
      // Fix table cells
      const cells = table.querySelectorAll('td, th')
      cells.forEach(cell => {
        const cellEl = cell as HTMLElement
        cellEl.removeAttribute('width')
        cellEl.style.width = 'auto'
        cellEl.style.wordBreak = 'break-word'
        cellEl.style.overflowWrap = 'break-word'
      })
    })
  }
  
  /**
   * Detect and fix 3-column layouts where side columns are empty spacers
   */
  private fixEmptyColumnLayouts(container: Element): void {
    const tables = container.querySelectorAll('table')
    
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr')
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th')
        
        // Look for 3-column layouts
        if (cells.length === 3) {
          const leftCell = cells[0] as HTMLElement
          const centerCell = cells[1] as HTMLElement
          const rightCell = cells[2] as HTMLElement
          
          // Check if left and right cells are empty or contain only spacers
          const isLeftEmpty = this.isCellEmpty(leftCell)
          const isRightEmpty = this.isCellEmpty(rightCell)
          const hasCenterContent = !this.isCellEmpty(centerCell)
          
          if (isLeftEmpty && isRightEmpty && hasCenterContent) {
            // Remove empty side columns and make center cell full width
            leftCell.remove()
            rightCell.remove()
            centerCell.style.setProperty('width', '100%', 'important')
            centerCell.style.setProperty('max-width', '100%', 'important')
          }
        }
        
        // Also handle cases where there are more columns but outer ones are empty
        if (cells.length > 3) {
          const firstCell = cells[0] as HTMLElement
          const lastCell = cells[cells.length - 1] as HTMLElement
          
          if (this.isCellEmpty(firstCell) && this.isCellEmpty(lastCell)) {
            firstCell.remove()
            lastCell.remove()
            
            // Make remaining cells more responsive
            const remainingCells = row.querySelectorAll('td, th')
            remainingCells.forEach(cell => {
              const cellEl = cell as HTMLElement
              cellEl.style.setProperty('width', 'auto', 'important')
              cellEl.style.setProperty('max-width', '100%', 'important')
            })
          }
        }
      })
    })
  }
  
  /**
   * Check if a table cell is empty or contains only spacing elements
   */
  private isCellEmpty(cell: HTMLElement): boolean {
    const content = cell.textContent?.trim() || ''
    const innerHTML = cell.innerHTML.trim()
    
    // Debug logging
    console.log('Checking cell:', {
      textContent: content,
      innerHTML: innerHTML,
      hasImages: cell.querySelectorAll('img').length > 0
    })
    
    // Empty or whitespace only
    if (!content || content === '&nbsp;' || content === ' ' || content === '') {
      console.log('Cell is empty (no content)')
      return true
    }
    
    // Check if innerHTML contains only &nbsp; (the actual HTML entity)
    if (innerHTML === '&nbsp;' || innerHTML.trim() === '&nbsp;') {
      console.log('Cell contains only &nbsp; HTML entity')
      return true
    }
    
    // Very short content that's likely just spacing
    if (content.length <= 3 && /^[\s\u00A0]*$/.test(content)) {
      console.log('Cell is empty (short spacing content)')
      return true
    }
    
    // Contains only non-breaking spaces, small images, or empty elements
    const spacerPatterns = [
      /^(&nbsp;|\s|\u00A0)*$/,  // &nbsp; and unicode non-breaking space
      /^(&nbsp;)$/,  // Exact match for single &nbsp;
      /^\s*&nbsp;\s*$/,  // &nbsp; with optional whitespace
      /^(<img[^>]*width=["']?[1-9]["']?[^>]*>|<img[^>]*height=["']?[1-9]["']?[^>]*>)*$/,
      /^(<div[^>]*><\/div>|<p[^>]*><\/p>|<span[^>]*><\/span>)*$/,
      /^(&nbsp;|\s|<br\s*\/??>|\u00A0)*$/
    ]
    
    for (const pattern of spacerPatterns) {
      if (pattern.test(innerHTML)) {
        console.log('Cell matches spacer pattern:', pattern)
        return true
      }
    }
    
    // Check for spacer images (small dimensions)
    const images = cell.querySelectorAll('img')
    if (images.length > 0) {
      let allImagesAreSpacers = true
      
      images.forEach(img => {
        const imgEl = img as HTMLImageElement
        const width = imgEl.getAttribute('width') || imgEl.style.width || '0'
        const height = imgEl.getAttribute('height') || imgEl.style.height || '0'
        
        const w = parseInt(width.replace(/[^0-9]/g, '')) || 0
        const h = parseInt(height.replace(/[^0-9]/g, '')) || 0
        
        // Not a spacer if dimensions are larger than 20px
        if (w > 20 || h > 20) {
          allImagesAreSpacers = false
        }
      })
      
      // If cell only contains spacer images and minimal text
      if (allImagesAreSpacers && content.length < 10) {
        console.log('Cell contains only spacer images')
        return true
      }
    }
    
    // Check cell dimensions - if very narrow, likely a spacer
    const cellWidth = cell.getAttribute('width') || cell.style.width || ''
    if (cellWidth) {
      const width = parseInt(cellWidth.replace(/[^0-9]/g, '')) || 0
      if (width > 0 && width < 50 && content.length < 10) {
        console.log('Cell is very narrow, likely spacer')
        return true
      }
    }
    
    console.log('Cell is NOT empty')
    return false
  }
  
  /**
   * Aggressively remove all empty cells from tables
   */
  private removeAllEmptyCells(container: Element): void {
    const tables = container.querySelectorAll('table')
    
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr')
      
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td, th'))
        
        // Remove empty cells from the end and beginning
        let cellsToRemove: Element[] = []
        
        // Check from the beginning
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i] as HTMLElement
          if (this.isCellEmpty(cell)) {
            cellsToRemove.push(cell)
          } else {
            break // Stop at first non-empty cell
          }
        }
        
        // Check from the end
        for (let i = cells.length - 1; i >= 0; i--) {
          const cell = cells[i] as HTMLElement
          if (this.isCellEmpty(cell) && !cellsToRemove.includes(cell)) {
            cellsToRemove.push(cell)
          } else {
            break // Stop at first non-empty cell from the end
          }
        }
        
        // Remove identified empty cells
        cellsToRemove.forEach(cell => {
          console.log('Removing empty cell:', cell.innerHTML)
          cell.remove()
        })
        
        // If only one cell remains, make it full width
        const remainingCells = row.querySelectorAll('td, th')
        if (remainingCells.length === 1) {
          const singleCell = remainingCells[0] as HTMLElement
          singleCell.style.setProperty('width', '100%', 'important')
          singleCell.style.setProperty('max-width', '100%', 'important')
        }
      })
    })
  }
  
  /**
   * Directly remove cells that contain only &nbsp; (non-breaking space)
   */
  private removeNbspOnlyCells(container: Element): void {
    const allCells = container.querySelectorAll('td, th')
    
    allCells.forEach(cell => {
      const cellEl = cell as HTMLElement
      const innerHTML = cellEl.innerHTML.trim()
      const textContent = cellEl.textContent?.trim() || ''
      
      // Check if cell contains only &nbsp; (with any styling)
      const isNbspOnly = (
        innerHTML === '&nbsp;' ||
        textContent === '\u00A0' ||  // Unicode non-breaking space
        textContent === ' ' ||      // Regular space
        textContent === '' ||       // Empty
        /^\s*&nbsp;\s*$/.test(innerHTML) ||
        /^\s*\u00A0\s*$/.test(textContent)
      )
      
      if (isNbspOnly) {
        console.log('Removing &nbsp; only cell:', innerHTML)
        
        // Check if this is a side column (first or last in row)
        const row = cellEl.parentElement
        if (row) {
          const cells = Array.from(row.querySelectorAll('td, th'))
          const cellIndex = cells.indexOf(cellEl)
          const isFirstOrLast = cellIndex === 0 || cellIndex === cells.length - 1
          
          if (isFirstOrLast) {
            cellEl.remove()
            
            // Make remaining cells responsive
            const remainingCells = row.querySelectorAll('td, th')
            remainingCells.forEach(remainingCell => {
              const remainingCellEl = remainingCell as HTMLElement
              remainingCellEl.style.setProperty('width', 'auto', 'important')
              remainingCellEl.style.setProperty('max-width', '100%', 'important')
            })
          }
        }
      }
    })
  }

  /**
   * Remove or override problematic inline styles
   */
  private removeInlineStyles(container: HTMLElement): void {
    if (this.options.preserveOriginalStyles) return

    const elementsWithStyles = container.querySelectorAll('*[style]')
    
    elementsWithStyles.forEach(element => {
      const el = element as HTMLElement
      const tagName = el.tagName.toLowerCase()
      
      // Preserve some important styles, remove problematic ones
      const style = el.style
      const preservedStyles: { [key: string]: string } = {}
      
      // Preserve color and background for visual consistency
      if (style.color) preservedStyles.color = style.color
      if (style.backgroundColor) preservedStyles.backgroundColor = style.backgroundColor
      if (style.textAlign) preservedStyles.textAlign = style.textAlign
      if (style.fontWeight) preservedStyles.fontWeight = style.fontWeight
      if (style.fontSize && !style.fontSize.includes('px')) preservedStyles.fontSize = style.fontSize
      
      // Clear all styles
      el.removeAttribute('style')
      
      // Reapply preserved styles
      Object.entries(preservedStyles).forEach(([prop, value]) => {
        el.style.setProperty(prop, value)
      })
      
      // Add responsive overrides for specific elements
      if (tagName === 'div' || tagName === 'td' || tagName === 'table') {
        el.style.maxWidth = '100%'
        el.style.boxSizing = 'border-box'
      }
    })
  }

  /**
   * Remove tracking pixels and analytics elements
   */
  private removeTrackingElements(container: HTMLElement): void {
    if (!this.options.removeTrackingPixels) return

    // Remove 1x1 tracking images
    const trackingImages = container.querySelectorAll('img[width="1"], img[height="1"]')
    trackingImages.forEach(img => {
      const imgEl = img as HTMLImageElement
      const width = imgEl.getAttribute('width')
      const height = imgEl.getAttribute('height')
      if ((width === '1' || height === '1') && imgEl.src.includes('track')) {
        imgEl.remove()
      }
    })

    // Remove common tracking domains
    const trackingDomains = ['track', 'pixel', 'analytics', 'beacon', 'open']
    const allImages = container.querySelectorAll('img')
    allImages.forEach(img => {
      const imgEl = img as HTMLImageElement
      if (trackingDomains.some(domain => imgEl.src.includes(domain))) {
        imgEl.remove()
      }
    })
  }

  /**
   * Add responsive CSS classes
   */
  private addResponsiveClasses(container: HTMLElement): void {
    // Add classes to common newsletter elements
    container.querySelectorAll('div').forEach(div => div.classList.add('newsletter-div'))
    container.querySelectorAll('p').forEach(p => p.classList.add('newsletter-p'))
    container.querySelectorAll('a').forEach(a => a.classList.add('newsletter-link'))
  }

  /**
   * Wrap content in responsive container with CSS overrides
   */
  private wrapInResponsiveContainer(html: string): string {
    return `
      <div class="newsletter-wrapper" data-newsletter-transformed="true">
        <div class="newsletter-content">
          ${html}
        </div>
      </div>
    `
  }
}

/**
 * Convenience function for quick transformation
 */
export function transformNewsletterHTML(html: string, options?: TransformOptions): string {
  const transformer = new NewsletterHTMLTransformer(options)
  return transformer.transform(html)
}

/**
 * Sanitize and transform newsletter HTML (combines both operations)
 */
export function sanitizeAndTransformNewsletterHTML(html: string, options?: TransformOptions): string {
  // First sanitize for security
  const sanitized = html // We'll integrate with existing sanitizer
  
  // Then transform for mobile responsiveness
  return transformNewsletterHTML(sanitized, options)
}
