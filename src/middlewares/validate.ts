import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

type RequestData = {
  body?: unknown;
  params?: unknown;
  query?: unknown;
};

export function validate<T extends RequestData>(
  schema: z.ZodType<T>,
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      throw new ApiError(
        400,
        result.error.issues[0]?.message ?? 'Invalid request',
      );
    }

    if (result.data.body !== undefined) {
      req.body = result.data.body;
    }

    if (result.data.params && typeof result.data.params === 'object') {
      Object.assign(req.params, result.data.params);
    }

    if (result.data.query && typeof result.data.query === 'object') {
      Object.assign(req.query, result.data.query);
    }

    next();
  };
}
