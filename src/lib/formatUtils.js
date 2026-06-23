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
