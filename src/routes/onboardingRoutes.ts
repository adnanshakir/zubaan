import { Router } from 'express';
import { createOnboarding } from '../controllers/onboardingController.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { onboardingRequestSchema } from '../validators/onboardingValidator.js';

export const onboardingRouter = Router();

onboardingRouter.post('/', validate(onboardingRequestSchema), asyncHandler(createOnboarding));
