import { Router } from 'express';
import {
  endConversation,
  getConversation,
  startConversation,
  takeConversationTurn,
} from '../controllers/conversationController.js';
import { attachUser } from '../middlewares/attachUser.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  conversationIdRequestSchema,
  conversationStartRequestSchema,
  conversationTurnRequestSchema,
} from '../validators/conversationValidator.js';

export const conversationRouter = Router();

conversationRouter.post(
  '/',
  attachUser,
  validate(conversationStartRequestSchema),
  asyncHandler(startConversation),
);

conversationRouter.post(
  '/:id/turns',
  attachUser,
  validate(conversationTurnRequestSchema),
  asyncHandler(takeConversationTurn),
);

conversationRouter.post(
  '/:id/end',
  attachUser,
  validate(conversationIdRequestSchema),
  asyncHandler(endConversation),
);

conversationRouter.get(
  '/:id',
  attachUser,
  validate(conversationIdRequestSchema),
  asyncHandler(getConversation),
);
