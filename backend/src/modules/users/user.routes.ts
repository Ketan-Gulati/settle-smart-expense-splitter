import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { updateUserSchema } from './user.schemas';

const router = Router();

router.use(authenticate);

router.get('/me', UserController.getMe);
router.patch('/me', validateRequest({ body: updateUserSchema }), UserController.updateMe);
router.get('/search', UserController.searchUsers);
router.get('/:id', UserController.getUserById);

export const userRoutes = router;
