import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  logger.error('Unexpected error', error);

  res.status(500).json({
    success: false,
    message: 'Something went wrong',
  });
};
