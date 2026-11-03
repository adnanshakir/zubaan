import { Router } from 'express';
import {
  getPlacement,
  postPlacementResult,
  putPlacementLevel,
} from '../controllers/placementController.js';
import { attachUser } from '../middlewares/attachUser.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  placementLevelRequestSchema,
  placementQuerySchema,
  placementResultRequestSchema,
} from '../validators/placementValidator.js';

export const placementRouter = Router();

placementRouter.get('/', attachUser, validate(placementQuerySchema), asyncHandler(getPlacement));
placementRouter.post(
  '/result',
  attachUser,
  validate(placementResultRequestSchema),
  asyncHandler(postPlacementResult),
);
placementRouter.put(
  '/level',
  attachUser,
  validate(placementLevelRequestSchema),
  asyncHandler(putPlacementLevel),
);
