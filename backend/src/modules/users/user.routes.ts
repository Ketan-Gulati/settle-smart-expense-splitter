import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { updateUserSchema } from './user.schemas';

const router = Router();

router.use(authenticate);

router.get('/me', UserController.getMe);
router.patch('/me', validateRequest({ body: updateUserSchema }), UserController.updateMe);
router.get('/me/deletion-status', UserController.getAccountDeletionStatus);
router.delete('/me', UserController.deleteAccount);
router.get('/friends', UserController.getFriends);
router.get('/search', UserController.searchUsers);
router.post('/change-password/request-otp', UserController.requestPasswordChangeOtp);
router.post('/change-password', UserController.changePassword);
router.get('/:id', UserController.getUserById);

export const userRoutes = router;
