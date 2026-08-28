import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', NotificationController.getNotifications);
router.post('/:id/respond', NotificationController.respondToNotification);
router.post('/:id/dismiss', NotificationController.dismissNotification);

export const notificationRoutes = router;
