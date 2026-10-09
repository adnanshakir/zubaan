import { Router } from 'express';
import { getHome } from '../controllers/homeController.js';
import { attachUser } from '../middlewares/attachUser.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const homeRouter = Router();

homeRouter.get('/', attachUser, asyncHandler(getHome));
