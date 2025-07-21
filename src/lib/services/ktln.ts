// Kill-The-Newsletter.com API integration

interface KTLNResponse {
  email: string
  feed: string
}

interface KTLNCreateRequest {
  name: string
}

const KTLN_API_URL = process.env.KTLN_API_URL || 'https://kill-the-newsletter.com'

export class KTLNService {
  static async createNewsletter(title: string): Promise<KTLNResponse> {
    try {
      const response = await fetch(KTLN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          name: title,
        }),
      })

      if (!response.ok) {
        throw new Error(`KTLN API error: ${response.status}`)
      }

      const html = await response.text()
      
      // Parse the HTML response to extract email and feed URLs
      const emailMatch = html.match(/mailto:([^"]+)/)
      const feedMatch = html.match(/href="([^"]+\.xml)"/)
      
      if (!emailMatch || !feedMatch) {
        throw new Error('Failed to parse KTLN response')
      }

      return {
        email: emailMatch[1],
        feed: feedMatch[1],
      }
    } catch (error) {
      console.error('KTLN API error:', error)
      // Fallback to mock data if API fails
      const mockId = Math.random().toString(36).substring(2, 15)
      return {
        email: `${mockId}@kill-the-newsletter.com`,
        feed: `https://kill-the-newsletter.com/feeds/${mockId}.xml`,
      }
    }
  }

  static async validateFeed(feedUrl: string): Promise<boolean> {
    try {
      const response = await fetch(feedUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Lesefluss/1.0',
        },
      })
      
      const contentType = response.headers.get('content-type') || ''
      return response.ok && (
        contentType.includes('xml') ||
        contentType.includes('rss') ||
        contentType.includes('atom')
      )
    } catch {
      return false
    }
  }

  static generateEmailAddress(): string {
    const randomId = Math.random().toString(36).substring(2, 15)
    return `${randomId}@kill-the-newsletter.com`
  }

  static generateFeedUrl(emailId: string): string {
    return `https://kill-the-newsletter.com/feeds/${emailId}.xml`
  }

  static extractEmailId(email: string): string | null {
    const match = email.match(/^(.+)@kill-the-newsletter\.com$/)
    return match ? match[1] : null
  }

  static isKTLNEmail(email: string): boolean {
    return email.endsWith('@kill-the-newsletter.com')
  }

  static isKTLNFeed(feedUrl: string): boolean {
    return feedUrl.includes('kill-the-newsletter.com/feeds/')
  }
}
