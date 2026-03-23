import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { 
  getUserProfile, 
  updateUserProfile, 
  changePassword 
} from '../controllers/userController.js';

const router = express.Router();

router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);
router.put('/password', authenticateToken, changePassword);

export default router;
