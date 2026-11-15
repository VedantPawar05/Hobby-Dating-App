import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import eventRoutes from './event.routes.js';
import bookingRoutes from './booking.routes.js';
import adminRoutes from './admin.routes.js';
import mixerRoutes from './mixer.routes.js';
import reportRoutes from './report.routes.js';
import organizerApplicationRoutes from './organizer-application.routes.js';
import notificationRoutes from './notification.routes.js';
import chatRoutes from './chat.routes.js';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes);
router.use('/admin', adminRoutes);
router.use('/mixer', mixerRoutes);
router.use('/reports', reportRoutes);
router.use('/organizer-applications', organizerApplicationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/conversations', chatRoutes);

export default router;
