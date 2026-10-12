import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

type RequestData = {
  body?: unknown;
  params?: unknown;
  query?: unknown;
};

export function validate<T extends RequestData>(schema: z.ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      throw new ApiError(400, result.error.issues[0]?.message ?? 'Invalid request');
    }

    // Store parsed values on res.locals to avoid mutating the original req
    res.locals.validated = result.data;

    next();
  };
}
