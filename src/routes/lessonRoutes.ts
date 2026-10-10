import { Router } from 'express';
import { getLesson, getLessons } from '../controllers/lessonController.js';
import { attachUser } from '../middlewares/attachUser.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  lessonDetailRequestSchema,
  lessonListRequestSchema,
} from '../validators/lessonValidator.js';

export const lessonRouter = Router();

lessonRouter.get(
  '/',
  attachUser,
  validate(lessonListRequestSchema),
  asyncHandler(getLessons),
);

lessonRouter.get(
  '/:id',
  attachUser,
  validate(lessonDetailRequestSchema),
  asyncHandler(getLesson),
);
