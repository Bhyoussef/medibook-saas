import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middlewares/auth.js';
import { login, register, logout, sendOTPController, verifyOTPController, completeProfile } from '../controllers/authController.js';

const router = express.Router();

// Traditional auth routes (keeping for compatibility)
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], login);

router.post('/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('phone').notEmpty().withMessage('Phone number is required')
], register);

router.post('/logout', authenticateToken, logout);

// OTP-based auth routes
router.post('/send-otp', [
  body('phone').isMobilePhone().withMessage('Please enter a valid mobile phone number')
], sendOTPController);

router.post('/verify-otp', [
  body('phone').isMobilePhone().withMessage('Please enter a valid mobile phone number'),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits')
], verifyOTPController);

router.post('/complete-profile', [
  body('phone').isMobilePhone().withMessage('Please enter a valid mobile phone number'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('dateOfBirth').isISO8601().withMessage('Please enter a valid date of birth')
], completeProfile);

export default router;
