import { Router } from 'express';
import { synthesizeTts } from '../controllers/speechController.js';
import { attachUser } from '../middlewares/attachUser.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { speechTtsRequestSchema } from '../validators/speechValidator.js';

export const speechRouter = Router();

speechRouter.post(
  '/tts',
  attachUser,
  validate(speechTtsRequestSchema),
  asyncHandler(synthesizeTts),
);
