import { Router } from 'express';
import { SettlementController } from './settlement.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { createSettlementSchema } from './settlement.schemas';
import { paginationQuerySchema } from '../expenses/expense.schemas';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/:groupId/settlements',
  idempotencyMiddleware,
  validateRequest({ body: createSettlementSchema }),
  SettlementController.recordSettlement
);

router.get(
  '/:groupId/settlements',
  validateRequest({ query: paginationQuerySchema }),
  SettlementController.getGroupSettlements
);

export const settlementRoutes = router;
