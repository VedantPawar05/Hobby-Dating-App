/**
 * Utility functions for formatting dates, currency, and event status.
 */

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPrice(price) {
  if (price === 0 || price === '0' || !price) {
    return 'Free';
  }
  return `$${Number(price).toFixed(2)}`;
}

export function getAvailableSlots(bookedCount = 0, capacity = 0) {
  return Math.max(0, capacity - bookedCount);
}
