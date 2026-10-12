import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middlewares/errorHandler.js';
import { conversationRouter } from './routes/conversationRoutes.js';
import { homeRouter } from './routes/homeRoutes.js';
import { lessonRouter } from './routes/lessonRoutes.js';
import { onboardingRouter } from './routes/onboardingRoutes.js';
import { speechRouter } from './routes/speechRoutes.js';
import type { ApiResponse } from './types/common.js';
import { getAudioStorageDirPath } from './utils/audioStorage.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/health', (_req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'API is running',
  };

  res.status(200).json(response);
});

app.use('/audio', express.static(getAudioStorageDirPath()));

app.use('/api/onboarding', onboardingRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/home', homeRouter);
app.use('/api/speech', speechRouter);

app.use(errorHandler);

export default app;
