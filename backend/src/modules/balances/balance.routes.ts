import { Router } from 'express';
import { BalanceController } from './balance.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/:groupId/balances', BalanceController.getGroupBalances);
router.get('/:groupId/balances/:userId', BalanceController.getPersonBalance);

export const balanceRoutes = router;
