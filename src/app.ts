import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middlewares/errorHandler.js';
import type { ApiResponse } from './types/common.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'API is running',
  };

  res.status(200).json(response);
});

app.use(errorHandler);

export default app;
