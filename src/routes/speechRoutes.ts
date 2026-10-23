import multer from 'multer';
import { Router } from 'express';
import { env } from '../config/env.js';
import { synthesizeTts, transcribeStt } from '../controllers/speechController.js';
import { attachUser } from '../middlewares/attachUser.js';
import { isSupportedSttMimeType, normalizeMimeType } from '../providers/stt/index.js';
import { validate } from '../middlewares/validate.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { speechSttRequestSchema, speechTtsRequestSchema } from '../validators/speechValidator.js';

export const speechRouter = Router();

const sttUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.STT_MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    const mimeType = normalizeMimeType(file.mimetype);

    if (!isSupportedSttMimeType(mimeType)) {
      cb(new ApiError(400, 'Unsupported audio format for STT'));
      return;
    }

    file.mimetype = mimeType;
    cb(null, true);
  },
});

speechRouter.post(
  '/tts',
  attachUser,
  validate(speechTtsRequestSchema),
  asyncHandler(synthesizeTts),
);

speechRouter.post(
  '/stt',
  attachUser,
  sttUpload.single('audio'),
  validate(speechSttRequestSchema),
  asyncHandler(transcribeStt),
);
