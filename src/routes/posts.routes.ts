import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { feedQuerySchema } from '../schemas/feed.schema.js';
import { listPosts } from '../controllers/posts.controller.js';

const router = Router();

router.get('/', validate(feedQuerySchema, 'query'), listPosts);

export default router;
