/**
 * Event-related enumerations and constants.
 */

export const EVENT_CATEGORIES = [
  'Running',
  'Hiking',
  'Badminton',
  'Football',
  'Cricket',
  'Cycling',
  'Padel',
  'Climbing',
  'Cooking',
  'Other',
];

export const EVENT_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

export const ALLOWED_EVENT_STATUSES = Object.values(EVENT_STATUSES);

