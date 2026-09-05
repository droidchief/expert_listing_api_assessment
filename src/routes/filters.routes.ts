import { Router } from 'express';
import { getFilterOptionsHandler } from '../controllers/filters.controller.js';

const router = Router();

router.get('/options', getFilterOptionsHandler);

export default router;
