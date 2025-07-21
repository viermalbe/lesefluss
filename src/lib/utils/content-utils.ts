/**
 * Utility functions for content processing and display
 */

/**
 * Calculate relative time from a date string
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  // Less than a minute
  if (diffInSeconds < 60) {
    return 'just now'
  }

  // Less than an hour
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  }

  // Less than a day
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  // Less than a week
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  // Less than a month
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  }

  // Less than a year
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000)
    return `${months} month${months === 1 ? '' : 's'} ago`
  }

  // More than a year
  const years = Math.floor(diffInSeconds / 31536000)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

/**
 * Calculate estimated reading time based on word count
 * Assumes average reading speed of 200 words per minute
 */
export function getEstimatedReadingTime(htmlContent: string): string {
  // Remove HTML tags and get plain text
  const plainText = htmlContent.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Count words
  const wordCount = plainText.split(' ').filter(word => word.length > 0).length

  // Calculate reading time (200 WPM average)
  const readingTimeMinutes = Math.ceil(wordCount / 200)

  if (readingTimeMinutes < 1) {
    return '< 1 min read'
  } else if (readingTimeMinutes === 1) {
    return '1 min read'
  } else {
    return `${readingTimeMinutes} min read`
  }
}

/**
 * Generate a consistent color for a source based on its title
 */
export function getSourceColor(sourceTitle: string): string {
  const colors = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-red-100 text-red-800 border-red-200',
  ]

  // Generate consistent hash from source title
  let hash = 0
  for (let i = 0; i < sourceTitle.length; i++) {
    const char = sourceTitle.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  return colors[Math.abs(hash) % colors.length]
}

/**
 * Truncate text at sentence boundaries for better readability
 */
export function truncateAtSentence(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  // Try to find the last sentence ending before maxLength
  const truncated = text.substring(0, maxLength)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  )

  if (lastSentenceEnd > maxLength * 0.7) {
    return truncated.substring(0, lastSentenceEnd + 1)
  }

  // Fallback: truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}
