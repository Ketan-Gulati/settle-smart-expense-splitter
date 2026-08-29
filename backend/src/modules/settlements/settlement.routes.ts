import { Router } from 'express';
import { SettlementController } from './settlement.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { createSettlementSchema } from './settlement.schemas';
import { paginationQuerySchema } from '../expenses/expense.schemas';

const groupRouter = Router({ mergeParams: true });
groupRouter.use(authenticate);

groupRouter.post(
  '/:groupId/settlements',
  idempotencyMiddleware,
  validateRequest({ body: createSettlementSchema }),
  SettlementController.recordSettlement
);

groupRouter.get(
  '/:groupId/settlements',
  validateRequest({ query: paginationQuerySchema }),
  SettlementController.getGroupSettlements
);

const globalRouter = Router();
globalRouter.use(authenticate);
globalRouter.get('/my', validateRequest({ query: paginationQuerySchema }), SettlementController.getUserSettlements);

export const groupSettlementRoutes = groupRouter;
export const settlementRoutes = globalRouter;
