/**
 * Escapes special RegExp characters in user-supplied search strings.
 * @param {string} value
 * @returns {string}
 */
export function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
