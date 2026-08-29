import { Router } from 'express';
import { ExpenseController } from './expense.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import {
  createExpenseSchema,
  updateExpenseSchema,
  paginationQuerySchema,
} from './expense.schemas';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  idempotencyMiddleware,
  validateRequest({ body: createExpenseSchema }),
  ExpenseController.createExpense
);
router.get('/my', validateRequest({ query: paginationQuerySchema }), ExpenseController.getUserExpenses);
router.get('/:expenseId', ExpenseController.getExpenseDetails);
router.patch('/:expenseId', validateRequest({ body: updateExpenseSchema }), ExpenseController.updateExpense);
router.delete('/:expenseId', ExpenseController.deleteExpense);
router.post('/:expenseId/request-edit-access', ExpenseController.requestEditAccess);

export const expenseRoutes = router;

// Also export group expense routes router
const groupExpenseRouter = Router({ mergeParams: true });
groupExpenseRouter.use(authenticate);
groupExpenseRouter.get(
  '/:groupId/expenses',
  validateRequest({ query: paginationQuerySchema }),
  ExpenseController.getGroupExpenses
);

export const groupExpenseRoutes = groupExpenseRouter;
