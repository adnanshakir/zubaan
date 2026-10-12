import type { RequestHandler } from 'express';
import {
  endConversation as endConversationService,
  getConversation as getConversationService,
  startConversation as startConversationService,
  takeConversationTurn as takeConversationTurnService,
} from '../services/conversationService.js';
import type {
  ConversationIdParams,
  ConversationStartInput,
  ConversationTurnInput,
} from '../validators/conversationValidator.js';

export const startConversation: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as { body: ConversationStartInput };
  const conversation = await startConversationService(req.user!._id, body);

  res.status(201).json(conversation);
};

export const takeConversationTurn: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as {
    params: ConversationIdParams;
    body: ConversationTurnInput;
  };
  const turn = await takeConversationTurnService(req.user!, params.id, body);

  res.status(200).json(turn);
};

export const endConversation: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as { params: ConversationIdParams };
  const summary = await endConversationService(req.user!, params.id);

  res.status(200).json(summary);
};

export const getConversation: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as { params: ConversationIdParams };
  const conversation = await getConversationService(req.user!, params.id);

  res.status(200).json(conversation);
};
