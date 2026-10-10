import type { RequestHandler } from 'express';
import { createOnboardingUser } from '../services/onboardingService.js';
import type { OnboardingInput } from '../validators/onboardingValidator.js';

export const createOnboarding: RequestHandler = async (req, res) => {
  const onboarding = await createOnboardingUser(req.body as OnboardingInput);

  res.status(201).json(onboarding);
};
