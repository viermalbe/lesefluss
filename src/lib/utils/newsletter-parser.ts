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
      
      if (this.options.enableDarkMode) {
        this.adaptForDarkMode($)
      }
      
      if (this.options.fixTableLayouts) {
        this.fixTableLayouts($)
      }
      
      // Stelle sicher, dass alle Links in einem neuen Tab geöffnet werden
      this.optimizeAllLinks($)
      
      // Entferne Kill-the-Newsletter Footer-Links und HR
      this.removeKillTheNewsletterFooter($)
      
      // Add responsive wrapper
      return this.wrapInResponsiveContainer($.html())
      
    } catch (error) {
      console.warn('Newsletter HTML parsing failed:', error)
      // Fallback: return original HTML
      return html
    }
  }
  
  /**
   * Optimize all links in the newsletter content
   * - Set target="_blank" for all links to open in new tab
   * - Apply consistent styling for proper word wrapping
   */
  private optimizeAllLinks($: cheerio.CheerioAPI): void {
    $('a').each((_, link) => {
      // Setze target="_blank" für alle Links
      $(link).attr('target', '_blank')
      $(link).attr('rel', 'noopener noreferrer')
      
      // Wende konsistente Styling-Regeln an
      let linkStyle = $(link).attr('style') || ''
      linkStyle += 'display: inline !important; white-space: normal !important; word-break: normal !important; overflow-wrap: break-word !important; hyphens: none !important;'
      $(link).attr('style', linkStyle)
    })
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
   * Passt Farben für den Dark Mode an
   * - Erkennt und ersetzt dunkle Textfarben durch CSS-Variablen
   * - Entfernt Hintergrundfarben, die im Dark Mode problematisch sein könnten
   */
  private adaptForDarkMode($: cheerio.CheerioAPI): void {
    // Liste der Farben, die als "dunkel" gelten und angepasst werden sollten
    const darkColorPatterns = [
      // Schwarz und Grautöne in verschiedenen Formaten
      /color\s*:\s*black\s*;?/gi,
      /color\s*:\s*#000\s*;?/gi,
      /color\s*:\s*#000000\s*;?/gi,
      /color\s*:\s*rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)\s*;?/gi,
      /color\s*:\s*rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*[\d\.]+\s*\)\s*;?/gi,
      
      // Grautöne
      /color\s*:\s*#[0-9a-f]{6}\s*;?/gi,  // Alle Hex-Farben (werden später gefiltert)
      /color\s*:\s*#[0-9a-f]{3}\s*;?/gi,   // Alle kurzen Hex-Farben (werden später gefiltert)
      /color\s*:\s*rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)\s*;?/gi, // Alle RGB-Farben (werden später gefiltert)
      /color\s*:\s*rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d\.]+\s*\)\s*;?/gi // Alle RGBA-Farben
    ]
    
    // Funktion zur Prüfung, ob eine Farbe dunkel ist
    const isDarkColor = (color: string): boolean => {
      // Entferne "color:" und Leerzeichen
      color = color.replace(/color\s*:\s*/i, '').trim()
      if (color.endsWith(';')) color = color.slice(0, -1)
      
      // Direkter Vergleich für einfache Fälle
      if (color === 'black') return true
      
      // Hex-Farben verarbeiten
      if (color.startsWith('#')) {
        let r, g, b
        
        if (color.length === 4) { // #RGB Format
          r = parseInt(color[1] + color[1], 16)
          g = parseInt(color[2] + color[2], 16)
          b = parseInt(color[3] + color[3], 16)
        } else if (color.length === 7) { // #RRGGBB Format
          r = parseInt(color.substring(1, 3), 16)
          g = parseInt(color.substring(3, 5), 16)
          b = parseInt(color.substring(5, 7), 16)
        } else {
          return false // Ungültiges Format
        }
        
        // Berechne Helligkeit (Luminanz)
        // Formel: (0.299*R + 0.587*G + 0.114*B)
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        
        // Wenn Helligkeit unter 0.6 liegt, gilt die Farbe als dunkel
        return brightness < 0.6
      }
      
      // RGB-Farben verarbeiten
      const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1])
        const g = parseInt(rgbMatch[2])
        const b = parseInt(rgbMatch[3])
        
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return brightness < 0.6
      }
      
      // RGBA-Farben verarbeiten
      const rgbaMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)/i)
      if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1])
        const g = parseInt(rgbaMatch[2])
        const b = parseInt(rgbaMatch[3])
        
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return brightness < 0.6
      }
      
      return false
    }
    
    // Alle Elemente mit style-Attribut durchgehen
    $('*[style*="color:"]').each((_, el) => {
      let style = $(el).attr('style') || ''
      
      // Für jedes Farbmuster prüfen
      for (const pattern of darkColorPatterns) {
        // Finde alle Farbdefinitionen im style-Attribut
        const colorMatches = style.match(pattern)
        
        if (colorMatches) {
          for (const colorMatch of colorMatches) {
            // Prüfe, ob die gefundene Farbe dunkel ist
            if (isDarkColor(colorMatch)) {
              // Ersetze die dunkle Farbe durch eine CSS-Variable
              style = style.replace(colorMatch, 'color: var(--foreground) !important;')
            }
          }
        }
      }
      
      // Aktualisiere das style-Attribut
      $(el).attr('style', style)
    })
    
    // Entferne explizite Hintergrundfarben, die im Dark Mode problematisch sein könnten
    $('*[style*="background"]').each((_, el) => {
      let style = $(el).attr('style') || ''
      
      // Entferne Hintergrundfarben, aber behalte Hintergrundbilder
      style = style
        .replace(/background-color\s*:\s*[^;]+;?/gi, '')
        .replace(/background\s*:\s*#[a-fA-F0-9]{3,6}\s*;?/gi, '')
        .replace(/background\s*:\s*rgb[a]?\([^)]+\)\s*;?/gi, '')
        .replace(/background\s*:\s*white\s*;?/gi, '')
        .replace(/background\s*:\s*#fff[f]?\s*;?/gi, '')
      
      $(el).attr('style', style)
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
      
      // Verbesserte Textumbruch-Eigenschaften für Tabellenzellen
      style += 'word-break: normal !important; overflow-wrap: anywhere !important; max-width: 100% !important;'
      
      // Optimiere Links innerhalb von Tabellenzellen
      $(cell).find('a').each((_, link) => {
        let linkStyle = $(link).attr('style') || ''
        // CSS für korrektes Umbrechen von Links: an Wortgrenzen ja, mitten im Wort nein
        linkStyle += 'display: inline !important; white-space: normal !important; word-break: normal !important; overflow-wrap: break-word !important; hyphens: none !important;'
        $(link).attr('style', linkStyle)
      })
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
    return content === '' || content === '&nbsp;' || content === ' '
  }
  
  /**
   * Entfernt den Kill-the-Newsletter Footer-Link und den <hr> davor
   * Diese Links werden automatisch von Kill-the-Newsletter am Ende jedes Newsletters eingefügt
   */
  private removeKillTheNewsletterFooter($: cheerio.CheerioAPI): void {
    // Suche nach dem spezifischen Kill-the-Newsletter Link-Pattern
    $('a[href*="kill-the-newsletter.com/feeds/"]').each((_, link) => {
      const $link = $(link)
      const linkText = $link.text().trim()
      
      // Prüfe, ob es sich um den Footer-Link handelt
      if (linkText.includes('Kill the Newsletter') || linkText.includes('feed settings')) {
        // Finde das übergeordnete <small> Element (falls vorhanden)
        const $small = $link.closest('small')
        
        // Finde das übergeordnete <p> oder <div> Element
        const $parent = $small.length ? $small.parent('p, div') : $link.parent('p, div')
        
        // Verschiedene Möglichkeiten, den <hr> zu finden
        
        // 1. <hr> direkt vor dem Elternelement
        let $prevHr = $parent.prev('hr')
        
        // 2. <hr> als Geschwisterelement auf gleicher Ebene (wenn in einem Container)
        if (!$prevHr.length) {
          // Suche nach dem nächsten <hr> oberhalb im Dokument
          $prevHr = $parent.prevAll('hr').first()
        }
        
        // 3. <hr> vor einem Container, der alles enthält
        if (!$prevHr.length && $parent.parent().length) {
          $prevHr = $parent.parent().prev('hr')
        }
        
        // Entferne den <hr>, falls gefunden
        if ($prevHr.length) {
          $prevHr.remove()
        }
        
        // Entferne das Elternelement mit dem Link
        if ($parent.length) {
          $parent.remove()
        } else if ($small.length) {
          // Oder entferne das <small>-Element, falls vorhanden
          $small.remove()
        } else {
          // Falls kein Elternelement gefunden wurde, entferne nur den Link
          $link.remove()
        }
      }
    })
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
        
        // Create a new div with the cell content and optimierten Wortumbruch-Eigenschaften
        const div = `<div class="newsletter-converted-table" style="word-break: normal !important; overflow-wrap: anywhere !important; hyphens: none !important;">${cellContent}</div>`
        
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
