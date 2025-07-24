/**
 * Newsletter Parser Utility
 * 
 * A utility for parsing and transforming newsletter HTML content using cheerio.
 * This provides a more robust and maintainable approach to handling newsletter HTML
 * compared to direct DOM manipulation.
 */

import * as cheerio from 'cheerio'

export interface NewsletterParserOptions {
  /**
   * Maximum width for the newsletter content
   * @default '100%'
   */
  maxWidth?: string;
  
  /**
   * Whether to preserve original inline styles
   * @default false
   */
  preserveOriginalStyles?: boolean;
  
  /**
   * Whether to enable dark mode adaptations
   * @default true
   */
  enableDarkMode?: boolean;
  
  /**
   * Whether to remove tracking pixels and elements
   * @default true
   */
  removeTrackingPixels?: boolean;
  
  /**
   * Whether to make images responsive
   * @default true
   */
  makeImagesResponsive?: boolean;
  
  /**
   * Whether to fix table layouts for better responsive behavior
   * @default true
   */
  fixTableLayouts?: boolean;
}

/**
 * Default options for the newsletter parser
 */
const DEFAULT_OPTIONS: Required<NewsletterParserOptions> = {
  maxWidth: '100%',
  preserveOriginalStyles: false,
  enableDarkMode: true,
  removeTrackingPixels: true,
  makeImagesResponsive: true,
  fixTableLayouts: true
}

/**
 * Newsletter Parser class for handling HTML newsletter content
 */
export class NewsletterParser {
  private options: Required<NewsletterParserOptions>
  
  /**
   * Create a new NewsletterParser instance
   * @param options - Configuration options for the parser
   */
  constructor(options: NewsletterParserOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }
  
  /**
   * Parse and transform newsletter HTML content
   * @param html - The raw HTML content to parse
   * @returns Transformed HTML content
   */
  parse(html: string): string {
    if (!html || typeof html !== 'string') return ''
    
    try {
      // Load HTML into cheerio
      const $ = cheerio.load(html)
      
      // Apply transformations based on options
      if (this.options.removeTrackingPixels) {
        this.removeTrackingElements($)
      }
      
      if (this.options.makeImagesResponsive) {
        this.makeImagesResponsive($)
      }
      
      if (!this.options.preserveOriginalStyles) {
        this.removeFixedDimensions($)
      }
      
      if (this.options.fixTableLayouts) {
        this.fixTableLayouts($)
      }
      
      // Add responsive wrapper
      return this.wrapInResponsiveContainer($.html())
      
    } catch (error) {
      console.warn('Newsletter HTML parsing failed:', error)
      // Fallback: return original HTML
      return html
    }
  }
  
  /**
   * Remove tracking pixels and hidden elements
   */
  private removeTrackingElements($: cheerio.CheerioAPI): void {
    // Remove common tracking pixels (1x1 images, zero-sized elements)
    $('img[width="1"][height="1"]').remove()
    $('img[width="0"][height="0"]').remove()
    $('div[style*="display:none"]').remove()
    $('div[style*="display: none"]').remove()
    
    // Remove elements with tracking-related class names
    $('[class*="track"],[class*="pixel"],[class*="analytics"],[class*="tracking"]').remove()
  }
  
  /**
   * Make images responsive and optimize through proxy
   * @param $ - Cheerio instance
   */
  private makeImagesResponsive($: cheerio.CheerioAPI): void {
    $('img').each((_, el) => {
      const $img = $(el)
      const originalSrc = $img.attr('src')
      
      if (originalSrc) {
        // Add data attribute with original source
        $img.attr('data-original-src', originalSrc)
        
        // Add data attribute for image proxy
        $img.attr('data-use-proxy', 'true')
        
        // Add client-side script hook for image optimization
        $img.addClass('newsletter-optimized-image')
      }
      
      // Add responsive attributes
      $img.attr('loading', 'lazy')
      $img.attr('style', 'max-width: 100%; height: auto;')
      
      // Remove fixed dimensions
      $img.removeAttr('width')
      $img.removeAttr('height')
      
      // Add responsive styling - Best Practice: use !important
      let style = $(el).attr('style') || ''
      style = style
        .replace(/width\s*:\s*[^;]+;?/gi, '')
        .replace(/height\s*:\s*[^;]+;?/gi, '')
        .replace(/max-width\s*:\s*[^;]+;?/gi, '')
      
      // Add max-width and preserve aspect ratio - Best Practice: width: 100% !important
      style += 'width: 100% !important; max-width: 100% !important; height: auto !important; display: block; margin: 0 auto;'
      
      // Add modern CSS for better rendering
      style += 'object-fit: contain;'
      
      $(el).attr('style', style)
      
      // Add loading="lazy" for better performance
      $(el).attr('loading', 'lazy')
      
      // Add decoding="async" for better performance
      $(el).attr('decoding', 'async')
      
      // Add class for potential CSS targeting
      $(el).addClass('newsletter-img')
    })
  }
  
  /**
   * Remove fixed dimensions from elements
   */
  private removeFixedDimensions($: cheerio.CheerioAPI): void {
    $('*[width], *[height], *[style*="width"], *[style*="height"]').each((_, el) => {
      // Remove width/height attributes
      $(el).removeAttr('width')
      $(el).removeAttr('height')
      
      // Modify style attribute to remove fixed dimensions
      let style = $(el).attr('style') || ''
      if (style) {
        style = style
          .replace(/width\s*:\s*[^;]+;?/gi, '')
          .replace(/height\s*:\s*[^;]+;?/gi, '')
          .replace(/min-width\s*:\s*[^;]+;?/gi, '')
          .replace(/min-height\s*:\s*[^;]+;?/gi, '')
          .replace(/max-height\s*:\s*[^;]+;?/gi, '')
        
        // Only set max-width if it's a container element
        // Prüfe, ob es sich um ein Element mit tagName handelt
        if (el.type === 'tag' && 'tagName' in el) {
          const tagName = el.tagName.toLowerCase();
          if (tagName === 'table' || tagName === 'div') {
            style += 'max-width: 100%;'
          }
        }
        
        $(el).attr('style', style)
      }
    })
  }
  
  /**
   * Fix table layouts for better responsive behavior
   */
  private fixTableLayouts($: cheerio.CheerioAPI): void {
    // Make tables responsive
    $('table').each((_, table) => {
      // Remove fixed width and add responsive styles
      $(table).removeAttr('width')
      
      let style = $(table).attr('style') || ''
      style = style
        .replace(/width\s*:\s*[^;]+;?/gi, '')
        .replace(/table-layout\s*:\s*[^;]+;?/gi, '')
      
      // Add responsive table styling
      style += 'width: 100%; max-width: 100%; table-layout: auto; border-collapse: collapse;'
      $(table).attr('style', style)
      
      // Add class for potential CSS targeting
      $(table).addClass('newsletter-table')
      
      // Handle nested tables - Best Practice: Setze width: 100% !important
      $(table).find('table').each((_, nestedTable) => {
        $(nestedTable).removeAttr('width')
        let nestedStyle = $(nestedTable).attr('style') || ''
        nestedStyle = nestedStyle
          .replace(/width\s*:\s*[^;]+;?/gi, '')
        
        nestedStyle += 'width: 100% !important; max-width: 100% !important;'
        $(nestedTable).attr('style', nestedStyle)
        $(nestedTable).addClass('newsletter-nested-table')
      })
      
      // Fix 3-column layouts with empty side columns
      this.fixEmptyColumnLayouts($, table)
      
      // Convert single-cell tables to divs
      this.convertSingleCellTables($, table)
    })
    
    // Fix table cells
    $('td, th').each((_, cell) => {
      // Remove width attribute
      $(cell).removeAttr('width')
      
      // Update style with Best Practices
      let style = $(cell).attr('style') || ''
      style = style.replace(/width\s*:\s*[^;]+;?/gi, '')
      
      // Add word-break for better text wrapping with !important
      style += 'word-break: break-word !important; overflow-wrap: break-word !important; max-width: 100% !important;'
      $(cell).attr('style', style)
      
      // Add class for additional CSS targeting
      $(cell).addClass('newsletter-table-cell')
    })
  }
  
  /**
   * Fix 3-column layouts where side columns are empty spacers
   */
  private fixEmptyColumnLayouts($: cheerio.CheerioAPI, table: any): void {
    $(table).find('tr').each((_, row) => {
      const cells = $(row).find('td, th')
      
      // Look for 3-column layouts
      if (cells.length === 3) {
        const leftCell = cells[0]
        const centerCell = cells[1]
        const rightCell = cells[2]
        
        // Check if left and right cells are empty or contain only spacers
        const isLeftEmpty = this.isCellEmpty($, leftCell)
        const isRightEmpty = this.isCellEmpty($, rightCell)
        const hasCenterContent = !this.isCellEmpty($, centerCell)
        
        if (isLeftEmpty && isRightEmpty && hasCenterContent) {
          // Remove empty side columns and make center cell full width
          $(leftCell).remove()
          $(rightCell).remove()
          $(centerCell).attr('style', 'width: 100% !important; max-width: 100% !important;')
          $(centerCell).attr('colspan', '3')
        }
      }
      
      // Also handle cases where there are more columns but outer ones are empty
      if (cells.length > 3) {
        const firstCell = cells[0]
        const lastCell = cells[cells.length - 1]
        
        if (this.isCellEmpty($, firstCell) && this.isCellEmpty($, lastCell)) {
          $(firstCell).remove()
          $(lastCell).remove()
          
          // Make remaining cells more responsive
          $(row).find('td, th').each((_, cell) => {
            let style = $(cell).attr('style') || ''
            style += 'width: auto !important; max-width: 100% !important;'
            $(cell).attr('style', style)
          })
        }
      }
    })
  }
  
  /**
   * Check if a table cell is empty or contains only spacing elements
   */
  private isCellEmpty($: cheerio.CheerioAPI, cell: any): boolean {
    const content = $(cell).text().trim()
    const html = $(cell).html() || ''
    
    // Empty or whitespace only
    if (!content || content === '&nbsp;' || content === ' ' || content === '') {
      return true
    }
    
    // Check if HTML contains only &nbsp; or whitespace
    if (html === '&nbsp;' || html.trim() === '&nbsp;' || /^\s*$/.test(html)) {
      return true
    }
    
    // Very short content that's likely just spacing
    if (content.length <= 3 && /^[\s\u00A0]*$/.test(content)) {
      return true
    }
    
    // Check for spacer images (small dimensions)
    const images = $(cell).find('img')
    if (images.length > 0) {
      let allImagesAreSpacers = true
      
      images.each((_, img) => {
        const width = $(img).attr('width') || '0'
        const height = $(img).attr('height') || '0'
        
        const w = parseInt(width.replace(/[^0-9]/g, '')) || 0
        const h = parseInt(height.replace(/[^0-9]/g, '')) || 0
        
        // Not a spacer if dimensions are larger than 20px
        if (w > 20 || h > 20) {
          allImagesAreSpacers = false
        }
      })
      
      // If cell only contains spacer images and minimal text
      if (allImagesAreSpacers && content.length < 10) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Convert single-cell tables to divs for better responsiveness
   */
  private convertSingleCellTables($: cheerio.CheerioAPI, table: any): void {
    const rows = $(table).find('tr')
    
    // Only process if this is a single-row, single-cell table
    if (rows.length === 1) {
      const cells = $(rows[0]).find('td, th')
      
      if (cells.length === 1) {
        // Get the cell content
        const cellContent = $(cells[0]).html() || ''
        
        // Create a new div with the cell content
        const div = `<div class="newsletter-converted-table">${cellContent}</div>`
        
        // Replace the table with the div
        $(table).replaceWith(div)
      }
    }
  }
  
  /**
   * Wrap the HTML content in a responsive container using Best Practices
   */
  private wrapInResponsiveContainer(html: string): string {
    return `
      <div class="newsletter-wrapper" style="
        all: initial;
        font-family: system-ui, sans-serif;
        line-height: 1.5;
        width: 100% !important;
        max-width: ${this.options.maxWidth};
        margin: 0 auto;
        overflow-x: hidden;
        word-break: break-word;
      ">
        ${html}
      </div>
    `.trim()
  }
}

/**
 * Parse and transform newsletter HTML content
 * @param html - The raw HTML content to parse
 * @param options - Configuration options for the parser
 * @returns Transformed HTML content
 */
export function parseNewsletterHtml(html: string, options: NewsletterParserOptions = {}): string {
  const parser = new NewsletterParser(options)
  return parser.parse(html)
}
