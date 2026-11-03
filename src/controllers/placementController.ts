import type { RequestHandler } from 'express';
import {
  getPlacementData,
  recordPlacementResult,
  setPlacementLevel,
} from '../services/placementService.js';
import type {
  PlacementLevelInput,
  PlacementResultInput,
} from '../validators/placementValidator.js';

export const getPlacement: RequestHandler = async (req, res) => {
  const lang = typeof req.query.lang === 'string' ? req.query.lang : undefined;
  res.status(200).json(getPlacementData(req.user!, lang));
};

export const postPlacementResult: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as { body: PlacementResultInput };
  const result = await recordPlacementResult(req.user!, body);
  res.status(200).json(result);
};

export const putPlacementLevel: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as { body: PlacementLevelInput };
  const result = await setPlacementLevel(req.user!, body);
  res.status(200).json(result);
};
