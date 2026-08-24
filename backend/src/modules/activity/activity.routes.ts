import { Router } from 'express';
import { ActivityController } from './activity.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { paginationQuerySchema } from '../expenses/expense.schemas';

const router = Router();

router.use(authenticate);

router.get('/', validateRequest({ query: paginationQuerySchema }), ActivityController.getActivityFeed);

export const activityRoutes = router;
