import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `Audio file exceeds ${env.STT_MAX_FILE_SIZE_BYTES} bytes`
        : 'Invalid multipart upload';

    res.status(400).json({
      error: {
        message,
      },
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
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
