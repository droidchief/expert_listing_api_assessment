import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { feedQuerySchema } from '../schemas/feed.schema.js';
import { likeParamsSchema, likeBodySchema } from '../schemas/like.schema.js';
import { commentParamsSchema, commentQuerySchema, createCommentSchema } from '../schemas/comment.schema.js';
import { listPosts } from '../controllers/posts.controller.js';
import { likePost } from '../controllers/likes.controller.js';
import { getComments, postComment } from '../controllers/comments.controller.js';

const router = Router();

router.get('/', validate(feedQuerySchema, 'query'), listPosts);

router.post(
  '/:id/like',
  validate(likeParamsSchema, 'params'),
  validate(likeBodySchema, 'body'),
  likePost,
);

router.get(
  '/:id/comments',
  validate(commentParamsSchema, 'params'),
  validate(commentQuerySchema, 'query'),
  getComments,
);

router.post(
  '/:id/comments',
  validate(commentParamsSchema, 'params'),
  validate(createCommentSchema, 'body'),
  postComment,
);

export default router;
