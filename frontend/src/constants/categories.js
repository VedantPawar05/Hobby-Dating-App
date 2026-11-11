export const EVENT_CATEGORIES = [
  'All',
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

export const SORT_OPTIONS = [
  { label: 'Upcoming Date (Soonest)', value: 'startDateTime_asc' },
  { label: 'Date (Furthest)', value: 'startDateTime_desc' },
  { label: 'Recently Created', value: 'createdAt_desc' },
  { label: 'Price (Low to High)', value: 'price_asc' },
];

export const GENDER_OPTIONS = [
  { label: 'Select gender', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];
