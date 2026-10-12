import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        message: error.message,
      },
    });
    return;
  }

  logger.error({ err: error }, 'Unexpected error');

  res.status(500).json({
    error: {
      message: 'Something went wrong',
    },
  });
};
