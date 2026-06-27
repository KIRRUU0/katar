// src/lib/slug.js
export const generateSlug = (text) => {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // replace spaces with -
    .replace(/&/g, '-and-') // replace & with 'and'
    .replace(/[^a-z0-9-]+/g, '') // remove all non-alphanumeric chars except -
    .replace(/--+/g, '-') // collapse multiple -
    .replace(/^-+/, '') // trim - from start of text
    .replace(/-+$/, '') // trim - from end of text
}
