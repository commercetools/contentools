import { Router } from 'express';
import {
  authenticateProject,
  health,
  refreshJwt,
} from '../controllers/auth.controller';
import { validateJwtIgnoreExpiry } from '../middleware/jwt.middleware';
import { requireProjectKey } from '../middleware/project-key.middleware';

const authRouter: Router = Router();

authRouter.post('/authenticate-project', authenticateProject);

authRouter.post('/refresh-jwt', validateJwtIgnoreExpiry, refreshJwt);

authRouter.get('/health', requireProjectKey, health);

export default authRouter;
