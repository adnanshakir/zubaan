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
  const conversation = await startConversationService(
    req.user!._id,
    req.body as ConversationStartInput,
  );

  res.status(201).json(conversation);
};

export const takeConversationTurn: RequestHandler = async (req, res) => {
  const turn = await takeConversationTurnService(
    req.user!,
    (req.params as ConversationIdParams).id,
    req.body as ConversationTurnInput,
  );

  res.status(200).json(turn);
};

export const endConversation: RequestHandler = async (req, res) => {
  const summary = await endConversationService(req.user!, (req.params as ConversationIdParams).id);

  res.status(200).json(summary);
};

export const getConversation: RequestHandler = async (req, res) => {
  const conversation = await getConversationService(
    req.user!,
    (req.params as ConversationIdParams).id,
  );

  res.status(200).json(conversation);
};
