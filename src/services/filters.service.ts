import { TRANSACTION_LABELS } from '../config/constants.js';
import { selectTopLocations, selectMaxPrice } from '../repositories/filters.repo.js';

const POST_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'property', label: 'Property' },
  { value: 'request', label: 'Request' },
];

// Same pairing chk_transaction_direction enforces in the database, surfaced to the
// client so the filter sheet can show only the relevant chips once a type is picked.
const TRANSACTION_POST_TYPE: Record<string, string> = {
  for_sale: 'property',
  for_rent: 'property',
  for_shortlet: 'property',
  looking_to_buy: 'request',
  looking_to_rent: 'request',
  looking_for_shortlet: 'request',
};

const BEDROOMS = [1, 2, 3, 4].map((value) => ({ value, label: `${value}+` }));

const POSTED_WITHIN = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const DEFAULT_MAX_PRICE = 250000000;

function roundUpToSensibleBound(value: number): number {
  // Round up to the nearest 10M so the slider bound isn't an ugly exact figure like
  // "₦64,999,999".
  const step = 10000000;
  return Math.ceil(value / step) * step;
}

export async function getFilterOptions() {
  const [locations, maxPrice] = await Promise.all([selectTopLocations(), selectMaxPrice()]);

  return {
    post_types: POST_TYPES,
    transaction_types: Object.entries(TRANSACTION_LABELS).map(([value, label]) => ({
      value,
      label,
      post_type: TRANSACTION_POST_TYPE[value]!,
    })),
    locations: locations.map((l) => ({ id: l.id, label: l.label, post_count: l.post_count })),
    bedrooms: BEDROOMS,
    posted_within: POSTED_WITHIN,
    price_range: {
      min: 0,
      max: maxPrice === null ? DEFAULT_MAX_PRICE : roundUpToSensibleBound(maxPrice),
      currency: 'NGN',
    },
  };
}
