import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { 
  getAllDoctors, 
  getDoctorById, 
  getDoctorsBySpecialty, 
  getDoctorAvailability,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorStats
} from '../controllers/doctorController.js';

const router = express.Router();

// Public routes
router.get('/', getAllDoctors);
router.get('/specialty/:specialty', getDoctorsBySpecialty);
router.get('/:id', getDoctorById);
router.get('/:id/availability', getDoctorAvailability);
router.get('/:id/stats', getDoctorStats);

// Admin routes (require authentication and admin role)
router.post('/', authenticateToken, createDoctor);
router.put('/:id', authenticateToken, updateDoctor);
router.delete('/:id', authenticateToken, deleteDoctor);

export default router;
