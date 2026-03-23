import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  getUserAppointments,
  getDoctorAppointments,
  updateAppointment,
  deleteAppointment,
  getAvailableTimeSlots,
  getAllAppointmentsAdmin
} from '../controllers/appointmentController.js';

const router = express.Router();

// Public routes (with authentication)
router.use(authenticateToken);

// Appointment routes
router.post('/', createAppointment);
router.get('/', getAllAppointments);
router.get('/admin/all', getAllAppointmentsAdmin);
router.get('/user/:userId', getUserAppointments);
router.get('/doctor/:doctorId', getDoctorAppointments);
router.get('/available-slots/:doctorId', getAvailableTimeSlots);
router.get('/:id', getAppointmentById);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);

export default router;
