import { Router } from 'express';
import { list, summary } from '../controllers/mistakeController.js';
import { attachUser } from '../middlewares/attachUser.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { mistakeListRequestSchema } from '../validators/mistakeValidator.js';

export const mistakeRouter = Router();

mistakeRouter.get('/summary', attachUser, asyncHandler(summary));
mistakeRouter.get('/', attachUser, validate(mistakeListRequestSchema), asyncHandler(list));
