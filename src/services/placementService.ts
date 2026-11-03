import type { HydratedDocument, Types } from 'mongoose';
import { placementHi } from '../content/placement/hi.js';
import {
  PLACEMENT_FREE_SECONDS,
  PLACEMENT_INSTRUCTIONS_EN,
  PLACEMENT_ITEMS,
} from '../content/placement/items.js';
import type { UserDocument } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  computePlacement,
  validatePlacementAnswers,
  type PlacementAnswer,
  type PlacementLevel,
} from '../utils/placement.js';
import { resolveLang } from './lessonBuilder.js';
import type {
  PlacementLevelInput,
  PlacementResultInput,
} from '../validators/placementValidator.js';

type PlacementUser = HydratedDocument<UserDocument> & { _id: Types.ObjectId };

function assertPlacementInitialized(user: PlacementUser): asserts user is PlacementUser & {
  placement: NonNullable<UserDocument['placement']>;
} {
  if (!user.placement) {
    throw new ApiError(500, 'User placement is not initialized');
  }
}

export function getPlacementData(
  user: Pick<UserDocument, 'nativeLanguage'>,
  requestedLang?: string,
) {
  const lang = resolveLang(requestedLang, user);
  const translation = lang === placementHi.lang ? placementHi : undefined;
  if (!translation) {
    throw new ApiError(404, 'Placement translation not found', 'TRANSLATION_NOT_FOUND');
  }

  return {
    lang,
    ladder: { tierSize: 3, passCount: 2 },
    instructions: {
      mcq: PLACEMENT_INSTRUCTIONS_EN.mcq,
      listen_pick: PLACEMENT_INSTRUCTIONS_EN.listen_pick,
      read_aloud: PLACEMENT_INSTRUCTIONS_EN.read_aloud,
      free: {
        en: PLACEMENT_INSTRUCTIONS_EN.free,
        native: translation.instructions.free,
      },
    },
    tiers: [1, 2, 3, 4].map((tier) => ({
      tier,
      items: PLACEMENT_ITEMS.filter((item) => item.tier === tier).map((item) => ({
        id: item.id,
        kind: item.kind,
        ...(item.prompt ? { prompt: item.prompt } : {}),
        ...(item.text ? { text: item.text } : {}),
        ...(item.options ? { options: item.options } : {}),
        ...(item.correct ? { correct: item.correct } : {}),
        ...(translation.items[item.id] ? { native: translation.items[item.id] } : {}),
      })),
    })),
    free: { maxSeconds: PLACEMENT_FREE_SECONDS },
  };
}

export async function recordPlacementResult(user: PlacementUser, input: PlacementResultInput) {
  assertPlacementInitialized(user);
  const answers = input.answers as readonly PlacementAnswer[];
  const validationError = validatePlacementAnswers(answers);
  if (validationError) throw new ApiError(400, validationError);

  const outcome = computePlacement(answers);
  user.placement.measured = outcome.level;
  user.placement.source = 'test';
  user.placement.completedAt = new Date();
  const sample = input.sample?.trim();
  user.placement.sample = sample && /[A-Za-z]/.test(sample) ? sample : undefined;
  await user.save();

  return outcome;
}

export async function setPlacementLevel(user: PlacementUser, input: PlacementLevelInput) {
  assertPlacementInitialized(user);
  user.placement.measured = input.level as PlacementLevel;
  user.placement.source = input.source;
  user.placement.completedAt = new Date();
  await user.save();
  return { level: input.level };
}
