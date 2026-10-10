import { isValidObjectId } from 'mongoose';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const attachUser = asyncHandler(async (req, _res, next) => {
  const userId = req.header('x-user-id');

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(401, 'Unauthorized');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(401, 'Unauthorized');
  }

  req.user = user;
  next();
});
