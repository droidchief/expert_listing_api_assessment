import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { signUploadSchema } from '../schemas/upload.schema.js';
import { postSignUpload } from '../controllers/upload.controller.js';

const router = Router();

router.post('/sign', validate(signUploadSchema, 'body'), postSignUpload);

export default router;
