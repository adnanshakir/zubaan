import { User } from '../models/User.js';
import type { OnboardingInput } from '../validators/onboardingValidator.js';
import { getRecommended } from './lessonService.js';

export async function createOnboardingUser(input: OnboardingInput) {
  const user = await User.create({
    ...input,
    placement: {
      selfReported: input.level,
    },
  });

  const recommendedLesson = await getRecommended(user);

  return {
    userId: user._id.toString(),
    user,
    recommendedLesson,
  };
}
