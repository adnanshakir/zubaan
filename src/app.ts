import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middlewares/errorHandler.js';
import { conversationRouter } from './routes/conversationRoutes.js';
import { attemptRouter } from './routes/attemptRoutes.js';
import { homeRouter } from './routes/homeRoutes.js';
import { lessonRouter } from './routes/lessonRoutes.js';
import { mistakeRouter } from './routes/mistakeRoutes.js';
import { onboardingRouter } from './routes/onboardingRoutes.js';
import { speechRouter } from './routes/speechRoutes.js';
import type { ApiResponse } from './types/common.js';
import { getAudioStorageDirPath } from './utils/audioStorage.js';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://zubaan-web.vercel.app',
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    credentials: true,
  }),
);
app.use(helmet());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.redirect(302, '/health');
});

app.get('/health', (_req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'API is running',
  };

  res.status(200).json(response);
});

app.use(
  '/audio',
  express.static(getAudioStorageDirPath(), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  }),
);

app.use('/api/onboarding', onboardingRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/mistakes', mistakeRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api', attemptRouter);
app.use('/api/home', homeRouter);
app.use('/api/speech', speechRouter);

app.use(errorHandler);

export default app;
