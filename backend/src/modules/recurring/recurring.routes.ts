import { Router } from 'express';
import { RecurringController } from './recurring.controller';
import { authenticate } from '../../middleware/auth.middleware';

export const recurringGroupRoutes = Router({ mergeParams: true });
recurringGroupRoutes.use(authenticate);
recurringGroupRoutes.post('/', RecurringController.create);
recurringGroupRoutes.get('/', RecurringController.listGroupSchedules);

export const recurringScheduleRoutes = Router();
recurringScheduleRoutes.use(authenticate);
recurringScheduleRoutes.patch('/:id', RecurringController.update);
recurringScheduleRoutes.delete('/:id', RecurringController.delete);
recurringScheduleRoutes.post('/process-overdue', RecurringController.triggerProcess);
