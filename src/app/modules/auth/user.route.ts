import express from 'express';
import { UserControllers } from './user.controller';
import { isAuthenticated } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/multer.middleware';

const router = express.Router();

// Public Routes
router.post('/register', UserControllers.registerUser);
router.post('/login',  UserControllers.loginUser);
router.post('/logout', UserControllers.logoutUser);

// Private Routes
router.patch(
  '/update-profile',
  isAuthenticated,
  upload.single('avatar'),
  UserControllers.updateProfile
);

router.get(
  "/get-me",
  isAuthenticated, 
  UserControllers.getMe
);

export const UserRoutes = router;