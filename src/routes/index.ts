import { Router } from 'express';
import healthRoutes from './health.routes.js';
import postsRoutes from './posts.routes.js';

const router = Router();

router.use(healthRoutes);
router.use('/posts', postsRoutes);

export default router;
