import { Router } from 'express';
import {
  completeAttempt,
  createAttempt,
  getAttempt,
  recordResult,
} from '../controllers/attemptController.js';
import { attachUser } from '../middlewares/attachUser.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  attemptResultRequestSchema,
  completeAttemptRequestSchema,
  createAttemptRequestSchema,
  getAttemptRequestSchema,
} from '../validators/attemptValidator.js';

export const attemptRouter = Router();

attemptRouter.post(
  '/lessons/:lessonId/attempts',
  attachUser,
  validate(createAttemptRequestSchema),
  asyncHandler(createAttempt),
);
attemptRouter.post(
  '/attempts/:attemptId/results',
  attachUser,
  validate(attemptResultRequestSchema),
  asyncHandler(recordResult),
);
attemptRouter.post(
  '/attempts/:attemptId/complete',
  attachUser,
  validate(completeAttemptRequestSchema),
  asyncHandler(completeAttempt),
);
attemptRouter.get(
  '/attempts/:attemptId',
  attachUser,
  validate(getAttemptRequestSchema),
  asyncHandler(getAttempt),
);
