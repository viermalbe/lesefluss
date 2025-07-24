import { describe, it, expect } from 'vitest'
import { NewsletterParser, parseNewsletterHtml } from './newsletter-parser'

describe('NewsletterParser', () => {
  // Test basic parsing functionality
  it('should handle empty or invalid input', () => {
    const parser = new NewsletterParser()
    expect(parser.parse('')).toBe('')
    expect(parser.parse(null as unknown as string)).toBe('')
    expect(parser.parse(undefined as unknown as string)).toBe('')
  })

  // Test image responsiveness
  it('should make images responsive', () => {
    const parser = new NewsletterParser()
    const html = '<img src="test.jpg" width="600" height="400" style="width: 600px; height: 400px;">'
    const result = parser.parse(html)
    
    // Should remove width/height attributes
    expect(result).not.toContain('width="600"')
    expect(result).not.toContain('height="400"')
    
    // Should add responsive styling
    expect(result).toContain('max-width: 100%')
    expect(result).toContain('height: auto')
    
    // Should add lazy loading
    expect(result).toContain('loading="lazy"')
  })

  // Test table layout fixes
  it('should fix table layouts', () => {
    const parser = new NewsletterParser()
    const html = '<table width="800" style="width: 800px;"><tr><td width="400">Content</td></tr></table>'
    const result = parser.parse(html)
    
    // Should remove fixed widths
    expect(result).not.toContain('width="800"')
    expect(result).not.toContain('width="400"')
    
    // Should add responsive styling
    expect(result).toContain('width: 100%')
    expect(result).toContain('max-width: 100%')
    expect(result).toContain('table-layout: auto')
  })

  // Test tracking pixel removal
  it('should remove tracking pixels', () => {
    const parser = new NewsletterParser()
    const html = `
      <div>
        <img src="content.jpg" width="600" height="400">
        <img src="tracker.gif" width="1" height="1">
        <div style="display:none"><img src="hidden-tracker.gif"></div>
        <div class="tracking-pixel"><img src="another-tracker.gif"></div>
      </div>
    `
    const result = parser.parse(html)
    
    // Should keep content images
    expect(result).toContain('content.jpg')
    
    // Should remove tracking pixels
    expect(result).not.toContain('tracker.gif')
    expect(result).not.toContain('hidden-tracker.gif')
    expect(result).not.toContain('another-tracker.gif')
    expect(result).not.toContain('tracking-pixel')
  })

  // Test responsive container wrapping
  it('should wrap content in responsive container', () => {
    const parser = new NewsletterParser({ maxWidth: '800px' })
    const html = '<p>Test content</p>'
    const result = parser.parse(html)
    
    expect(result).toContain('class="newsletter-container"')
    expect(result).toContain('max-width: 800px')
    expect(result).toContain('<p>Test content</p>')
  })

  // Test convenience function
  it('should work with convenience function', () => {
    const html = '<div style="width: 800px;">Test</div>'
    const result = parseNewsletterHtml(html, { maxWidth: '90%' })
    
    expect(result).toContain('class="newsletter-container"')
    expect(result).toContain('max-width: 90%')
    expect(result).not.toContain('width: 800px')
  })

  // Test preserving original styles
  it('should preserve original styles when option is set', () => {
    const html = '<div style="width: 800px; color: red;">Test</div>'
    const result = parseNewsletterHtml(html, { preserveOriginalStyles: true })
    
    // Should preserve color style
    expect(result).toContain('color: red')
    
    // Should still wrap in container
    expect(result).toContain('class="newsletter-container"')
  })
})
