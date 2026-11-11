/**
 * User-related application constants and enumerations.
 */

export const USER_ROLES = {
  USER: 'user',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
};

export const ALLOWED_ROLES = Object.values(USER_ROLES);

export const GENDERS = [
  'male',
  'female',
  'non-binary',
  'other',
  'prefer_not_to_say',
];

export const DEFAULT_ACTIVITIES = [
  'running',
  'hiking',
  'badminton',
  'climbing',
  'cycling',
  'bouldering',
  'tennis',
  'padel',
  'yoga',
  'swimming',
];
