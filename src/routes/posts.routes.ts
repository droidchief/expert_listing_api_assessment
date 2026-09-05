import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { feedQuerySchema } from '../schemas/feed.schema.js';
import { likeParamsSchema, likeBodySchema } from '../schemas/like.schema.js';
import { listPosts } from '../controllers/posts.controller.js';
import { likePost } from '../controllers/likes.controller.js';

const router = Router();

router.get('/', validate(feedQuerySchema, 'query'), listPosts);

router.post(
  '/:id/like',
  validate(likeParamsSchema, 'params'),
  validate(likeBodySchema, 'body'),
  likePost,
);

export default router;
