import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', NotificationController.getNotifications);
router.post('/remind', NotificationController.sendPaymentReminder);
router.post('/register-push-token', NotificationController.registerPushToken);
router.post('/:id/respond', NotificationController.respondToNotification);
router.post('/:id/dismiss', NotificationController.dismissNotification);

export const notificationRoutes = router;
