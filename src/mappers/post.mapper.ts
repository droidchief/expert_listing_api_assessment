import { TRANSACTION_LABELS, ROLE_LABELS } from '../config/constants.js';
import type { FeedRow, FeedRowMedia, FeedRowTopComment, FeedRowLiker } from '../repositories/posts.repo.js';

function toNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function mapMedia(media: FeedRowMedia[]) {
  return media.map((m) => ({
    id: m.id,
    media_type: m.media_type,
    url: m.url,
    thumbnail_url: m.thumbnail_url,
    blurhash: m.blurhash,
    width_px: m.width_px,
    height_px: m.height_px,
    aspect_ratio: toNumber(m.aspect_ratio),
    duration_seconds: m.duration_seconds,
    alt_text: m.alt_text,
    position: m.position,
  }));
}

function mapTopComment(topComment: FeedRowTopComment | null) {
  if (!topComment) return null;
  return {
    id: topComment.id,
    body: topComment.body,
    created_at: topComment.created_at,
    author: {
      username: topComment.author.username,
      display_name: topComment.author.display_name,
      avatar_url: topComment.author.avatar_url,
    },
  };
}

function mapLikers(likedBy: FeedRowLiker[]) {
  return likedBy.map((u) => ({ username: u.username, avatar_url: u.avatar_url }));
}

export interface PostDto {
  id: string;
  post_type: string;
  body: string;
  transaction_type: string | null;
  transaction_label: string | null;
  location_id: string | null;
  location_label: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  price: {
    amount: number;
    currency: string;
    period: string | null;
    negotiable: boolean;
  } | null;
  property: {
    bedrooms: number | null;
    bathrooms: number | null;
    parking_spaces: number | null;
    size_sqm: number | null;
    amenities: string[];
    available_from: string | null;
    inspection_at: string | null;
  } | null;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    avatar_blurhash: string | null;
    role: string | null;
    role_label: string | null;
    is_verified: boolean;
    is_business: boolean;
  };
  show_role_badge: boolean;
  media: ReturnType<typeof mapMedia>;
  counts: {
    likes: number;
    comments: number;
    shares: number;
    bookmarks: number;
    views: number;
  };
  viewer_state: { has_liked: boolean; is_author: boolean };
  liked_by_preview: { total: number; users: ReturnType<typeof mapLikers> };
  top_comment: ReturnType<typeof mapTopComment>;
  is_edited: boolean;
  is_pinned: boolean;
  created_at: string;
}

export function mapPostRow(row: FeedRow, viewerId: string): PostDto {
  const latitude = toNumber(row.latitude);
  const longitude = toNumber(row.longitude);
  const priceAmount = toNumber(row.price_amount);

  const property =
    row.bedrooms === null &&
    row.bathrooms === null &&
    row.parking_spaces === null &&
    row.property_size_sqm === null &&
    row.amenities.length === 0 &&
    row.available_from === null &&
    row.inspection_at === null
      ? null
      : {
          bedrooms: row.bedrooms,
          bathrooms: row.bathrooms,
          parking_spaces: row.parking_spaces,
          size_sqm: toNumber(row.property_size_sqm),
          amenities: row.amenities,
          available_from: row.available_from,
          inspection_at: row.inspection_at,
        };

  return {
    id: row.id,
    post_type: row.post_type,
    body: row.body,
    transaction_type: row.transaction_type,
    transaction_label: row.transaction_type ? TRANSACTION_LABELS[row.transaction_type]! : null,
    location_id: row.location_id,
    location_label: row.location_label,
    coordinates: latitude === null || longitude === null ? null : { latitude, longitude },
    price:
      priceAmount === null
        ? null
        : {
            amount: priceAmount,
            currency: row.price_currency,
            period: row.price_period,
            negotiable: row.is_price_negotiable,
          },
    property,
    author: {
      id: row.author.id,
      username: row.author.username,
      display_name: row.author.display_name,
      avatar_url: row.author.avatar_url,
      avatar_blurhash: row.author.avatar_blurhash,
      role: row.author.role,
      role_label: row.author.role ? ROLE_LABELS[row.author.role]! : null,
      is_verified: row.author.is_verified,
      is_business: row.author.is_business,
    },
    // Design rule: the role badge (e.g. "· Developer") only ever renders on a
    // property listing — a request post never shows it even when the author has a
    // role (Felix Okon's requests show no badge despite being a broker).
    show_role_badge: row.post_type === 'property' && row.author.role !== null,
    media: mapMedia(row.media),
    counts: {
      likes: row.like_count,
      comments: row.comment_count,
      shares: row.share_count,
      bookmarks: row.bookmark_count,
      views: row.view_count,
    },
    // No has_bookmarked: the bookmarks table was dropped in Part 5b.
    viewer_state: {
      has_liked: row.viewer_has_liked,
      is_author: row.author.id === viewerId,
    },
    liked_by_preview: {
      total: row.like_count,
      users: mapLikers(row.liked_by),
    },
    top_comment: mapTopComment(row.top_comment),
    is_edited: row.is_edited,
    is_pinned: row.is_pinned,
    created_at: row.created_at_iso,
  };
}
