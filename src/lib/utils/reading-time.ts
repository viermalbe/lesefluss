/**
 * Berechnet die geschätzte Lesezeit für einen Text
 * @param text Der zu lesende Text
 * @param wordsPerMinute Durchschnittliche Lesegeschwindigkeit in Wörtern pro Minute
 * @returns Geschätzte Lesezeit in Minuten
 */
export function calculateReadingTime(text: string, wordsPerMinute: number = 200): number {
  if (!text) return 0
  
  // Entferne HTML-Tags und Whitespace
  const cleanText = text.replace(/<[^>]*>/g, '').trim()
  
  // Zähle die Wörter (durch Leerzeichen getrennte Einheiten)
  const words = cleanText.split(/\s+/).filter(Boolean).length
  
  // Berechne die Lesezeit in Minuten
  const minutes = Math.max(1, Math.round(words / wordsPerMinute))
  
  return minutes
}

/**
 * Formatiert die Lesezeit als String
 * @param minutes Lesezeit in Minuten
 * @returns Formatierter String (z.B. "5 min read")
 */
export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`
}
