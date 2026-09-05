import { Router } from 'express';
import { getStories } from '../controllers/stories.controller.js';

const router = Router();

router.get('/', getStories);

export default router;
