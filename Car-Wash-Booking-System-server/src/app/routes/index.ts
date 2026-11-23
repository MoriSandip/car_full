import { Router } from 'express';
import { authRoutes } from '../../modules/Auth/auth.route';
import { serviceRoute } from '../../modules/service/service.route';
import { slotRoutes } from '../../modules/slots/slote.route';
import { bookingRoutes } from '../../modules/bookings/bookings.route';
import { PaymentRoutes } from '../../modules/payment/payment.route';
import { UserRoutes } from '../../modules/User/user.route';
import { societyRoute } from '../../modules/Society/society.route';
import { flatRoute } from '../../modules/Flat/flat.route';
import { carRoute } from '../../modules/Car/car.route';
import { planRoute } from '../../modules/PlanCharges/plan.route';
import { membershipRoute } from '../../modules/Membership/membership.route';
import { bookingNewRoute } from '../../modules/Booking/booking.route';
import { washServiceRoute } from '../../modules/WashService/washService.route';
import { workerRoutes } from '../../modules/Worker/worker.route';
import { customerRoutes } from '../../modules/Customer/customer.route';
import { offerRoute } from '../../modules/Offer/offer.route';
import { ImageUploadRoutes } from '../../modules/Upload/imageUpload.route';
import { reportRoute } from '../../modules/Report/report.route';
import { inventoryRoute } from '../../modules/Inventory/inventory.route';
import { complaintRoute } from '../../modules/Complaint/complaint.route';

const router = Router();

const moduleRoutes = [
  // {
  //   path: '/',
  //   route: bookingRoutes,
  // },
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/payment',
    route: PaymentRoutes,
  },
  {
    path: '/uploads',
    route: ImageUploadRoutes,
  },
  {
    path: '/services',
    route: serviceRoute,
  },
  {
    path: '/societies',
    route: societyRoute,
  },
  {
    path: '/services/slots',
    route: slotRoutes,
  },
  {
    path: '/slots',
    route: slotRoutes,
  },
  {
    path: '/flats',
    route: flatRoute,
  },
  {
    path: '/cars',
    route: carRoute,
  },
  {
    path: '/plans',
    route: planRoute,
  },
  {
    path: '/offers',
    route: offerRoute,
  },
  {
    path: '/wash-services',
    route: washServiceRoute,
  },
  {
    path: '/bookings',
    route: bookingNewRoute,
  },
  {
    path: '/memberships',
    route: membershipRoute,
  },
   {
    path: '/workers',
    route: workerRoutes,
  },
   {
    path: '/customers',
    route: customerRoutes,
  },
  {
    path: '/reports',
    route: reportRoute,
  },
  {
    path: '/inventory',
    route: inventoryRoute,
  },
  {
    path: '/complaints',
    route: complaintRoute,
  },

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
