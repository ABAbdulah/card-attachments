import { Router } from 'express';
import { route, userId } from '../../lib/http.js';
import { getProgress } from './gamification.service.js';

export const progressRouter = Router();

progressRouter.get(
  '/',
  route(async (req, res) => {
    res.json(await getProgress(userId(req)));
  }),
);
