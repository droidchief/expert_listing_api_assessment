import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { locationQuerySchema } from '../schemas/location.schema.js';
import { getLocations } from '../controllers/location.controller.js';

const router = Router();

router.get('/', validate(locationQuerySchema, 'query'), getLocations);

export default router;
