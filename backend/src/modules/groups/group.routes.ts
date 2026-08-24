import { Router } from 'express';
import { GroupController } from './group.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { createGroupSchema, updateGroupSchema, addMemberSchema } from './group.schemas';

const router = Router();

// Public invitation preview route (no auth required to preview group details before joining)
router.get('/invites/:codeOrToken', GroupController.resolveInvite);

// Authenticated group and invite routes
router.use(authenticate);

router.post('/', validateRequest({ body: createGroupSchema }), GroupController.createGroup);
router.get('/', GroupController.getUserGroups);

// Invite routes
router.post('/:groupId/invites', GroupController.createInvite);
router.delete('/:groupId/invites/:inviteId', GroupController.revokeInvite);
router.post('/invites/:codeOrToken/join', GroupController.joinGroup);

// Group details & updates
router.get('/:groupId', GroupController.getGroupDetails);
router.patch('/:groupId', validateRequest({ body: updateGroupSchema }), GroupController.updateGroup);
router.delete('/:groupId', GroupController.deleteGroup);

// Membership routes
router.post('/:groupId/members', validateRequest({ body: addMemberSchema }), GroupController.addMember);
router.delete('/:groupId/members/:userId', GroupController.removeMember);

export const groupRoutes = router;
