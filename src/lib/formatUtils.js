/**
 * Format a date string to a readable Indonesian locale date
 * Example output: "1 Agustus 2026"
 */
export const formatDate = (dateStr) => {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

/**
 * Strips HTML tags and decodes common HTML entities (like &nbsp;) to plain text
 */
export const stripHtml = (html) => {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/gi, ' ') // Replace non-breaking spaces with normal spaces
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim()
}
