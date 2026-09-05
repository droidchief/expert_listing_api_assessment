import type { Request, Response } from 'express';
import { signUpload } from '../services/upload.service.js';
import { ok } from '../utils/envelope.js';
import type { SignUploadBody } from '../schemas/upload.schema.js';

export async function postSignUpload(req: Request, res: Response): Promise<void> {
  const body = req.body as SignUploadBody;
  const result = await signUpload(body, req.user.id);
  res.json(ok(result, String(req.id)));
}
