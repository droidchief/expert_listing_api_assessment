import { ROLE_LABELS } from '../config/constants.js';
import type {
  CommentRow,
  CommentRowAuthor,
  CommentRowReply,
  HydratedComment,
} from '../repositories/comments.repo.js';

function mapAuthor(author: CommentRowAuthor) {
  return {
    id: author.id,
    username: author.username,
    display_name: author.display_name,
    avatar_url: author.avatar_url,
    role: author.role,
    role_label: author.role ? ROLE_LABELS[author.role]! : null,
    is_verified: author.is_verified,
  };
}

function mapReplies(replies: CommentRowReply[]) {
  return replies.map((r) => ({
    id: r.id,
    body: r.body,
    created_at: r.created_at,
    author: {
      username: r.author.username,
      display_name: r.author.display_name,
      avatar_url: r.author.avatar_url,
    },
  }));
}

export interface CommentDto {
  id: string;
  post_id: string;
  body: string;
  author: ReturnType<typeof mapAuthor>;
  counts: { likes: number; replies: number };
  viewer_state: { is_author: boolean };
  replies_preview: ReturnType<typeof mapReplies>;
  is_edited: boolean;
  created_at: string;
}

export function mapCommentRow(row: CommentRow, viewerId: string): CommentDto {
  return {
    id: row.id,
    post_id: row.post_id,
    body: row.body,
    author: mapAuthor(row.author),
    // likes is always 0 — comment_likes was dropped in Part 5b. Kept so the DTO
    // stays stable if it ever comes back; never computed.
    counts: { likes: row.like_count, replies: row.reply_count },
    viewer_state: { is_author: row.author.id === viewerId },
    replies_preview: mapReplies(row.replies_preview),
    is_edited: row.is_edited,
    created_at: row.created_at_iso,
  };
}

// A freshly created comment can never have replies yet, so replies_preview is
// hardcoded to [] rather than fetched.
export function mapHydratedComment(row: HydratedComment, viewerId: string): CommentDto {
  return {
    id: row.id,
    post_id: row.post_id,
    body: row.body,
    author: mapAuthor(row.author),
    counts: { likes: row.like_count, replies: row.reply_count },
    viewer_state: { is_author: row.author.id === viewerId },
    replies_preview: [],
    is_edited: row.is_edited,
    created_at: row.created_at_iso,
  };
}
