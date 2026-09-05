import { Router } from 'express';
import healthRoutes from './health.routes.js';
import postsRoutes from './posts.routes.js';
import meRoutes from './me.routes.js';
import filtersRoutes from './filters.routes.js';
import locationRoutes from './location.routes.js';
import uploadRoutes from './upload.routes.js';
import storiesRoutes from './stories.routes.js';

const router = Router();

router.use(healthRoutes);
router.use('/posts', postsRoutes);
router.use('/me', meRoutes);
router.use('/filters', filtersRoutes);
router.use('/locations', locationRoutes);
router.use('/uploads', uploadRoutes);
router.use('/stories', storiesRoutes);

export default router;
