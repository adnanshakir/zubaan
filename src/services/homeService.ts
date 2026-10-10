import type { UserDocument } from '../models/User.js';
import { getRecommended } from './lessonService.js';

export async function getHomeData(user: UserDocument) {
  const recommendedLesson = await getRecommended(user);

  return {
    greetingName: user.name ?? 'there',
    recommendedLesson,
  };
}
