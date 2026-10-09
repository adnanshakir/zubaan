import type { RequestHandler } from 'express';
import { getHomeData } from '../services/homeService.js';

export const getHome: RequestHandler = async (req, res) => {
  const home = await getHomeData(req.user!);

  res.status(200).json(home);
};
