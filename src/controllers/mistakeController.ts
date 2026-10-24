import type { RequestHandler } from 'express';
import { getMistakeSummary, listMistakes } from '../services/mistakeService.js';
import type { MistakeListQuery } from '../validators/mistakeValidator.js';

export const list: RequestHandler = async (req, res) => {
  const query = (res.locals?.validated?.query ?? req.query) as MistakeListQuery;
  const mistakes = await listMistakes(req.user!._id, query);

  res.status(200).json(mistakes);
};

export const summary: RequestHandler = async (req, res) => {
  const mistakes = await getMistakeSummary(req.user!._id);

  res.status(200).json(mistakes);
};
