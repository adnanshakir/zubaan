import type { RequestHandler } from 'express';
import {
  completeAttempt as completeAttemptService,
  createAttempt as createAttemptService,
  getAttempt as getAttemptService,
  recordAttemptResult,
} from '../services/attemptService.js';
import type {
  AttemptIdParams,
  AttemptResultInput,
  CompleteAttemptInput,
  CreateAttemptParams,
} from '../validators/attemptValidator.js';

export const createAttempt: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as { params: CreateAttemptParams };
  res.status(201).json(await createAttemptService(req.user!._id, params.lessonId));
};

export const recordResult: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as {
    params: AttemptIdParams;
    body: AttemptResultInput;
  };
  res.status(200).json(await recordAttemptResult(req.user!._id, params.attemptId, body));
};

export const completeAttempt: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as {
    params: AttemptIdParams;
    body: CompleteAttemptInput;
  };
  res.status(200).json(await completeAttemptService(req.user!._id, params.attemptId, body));
};

export const getAttempt: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as { params: AttemptIdParams };
  res.status(200).json(await getAttemptService(req.user!._id, params.attemptId));
};
