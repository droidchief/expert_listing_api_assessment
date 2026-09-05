import { Router } from 'express';
import { getMeHandler } from '../controllers/me.controller.js';

const router = Router();

router.get('/', getMeHandler);

export default router;
