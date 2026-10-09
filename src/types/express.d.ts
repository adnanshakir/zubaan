import type { HydratedDocument } from 'mongoose';
import type { UserDocument } from '../models/User.js';

declare global {
  namespace Express {
    interface Request {
      user?: HydratedDocument<UserDocument>;
    }
  }
}

export {};
