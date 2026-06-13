import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateProfileSchema, changePasswordSchema } from '../schemas/user.schema';
import * as userController from '../controllers/user.controller';

const router = Router();

router.get('/me', authenticate, userController.getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), userController.updateMe);
router.patch('/me/password', authenticate, validate(changePasswordSchema), userController.changePassword);

export default router;
