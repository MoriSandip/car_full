
import express from "express";
import validateRequest from "../../app/middlewares/validateRequest";
import auth from "../../app/middlewares/auth";
import { USER_ROLE } from "../Auth/auth.constant";
import { BookingController } from "./booking.controller";
import {
  assignWorkerValidationSchema,
  bookingReviewValidationSchema,
  createBookingValidationSchema,
  updateBookingStatusValidationSchema,
  updateBookingValidationSchema,
} from "./booking.validation";

const route = express.Router();

// GET routes
route.get("/stats", auth(USER_ROLE.admin), BookingController.stats);

route.get("/mine", auth("CUSTOMER"), BookingController.listMine);

route.get("/", auth(USER_ROLE.admin, "CUSTOMER"), BookingController.list);

route.get("/:id", auth(USER_ROLE.admin, "CUSTOMER"), BookingController.getOne);

// POST — Admin and customer
route.post(
  "/",
  auth(USER_ROLE.admin, "CUSTOMER"),
  validateRequest(createBookingValidationSchema),
  BookingController.create
);

// PATCH — Admin only
route.patch(
  "/:id/status",
  auth(USER_ROLE.admin),
  validateRequest(updateBookingStatusValidationSchema),
  BookingController.changeStatus
);

// PUT — Admin only
route.patch(
  "/:id",
  auth(USER_ROLE.admin, "CUSTOMER"),
  validateRequest(updateBookingValidationSchema),
  BookingController.update
);

route.post(
  '/:id/review',
  auth('CUSTOMER'),
  validateRequest(bookingReviewValidationSchema),
  BookingController.submitReview,
);

route.put(
  "/:id",
  auth(USER_ROLE.admin),
  validateRequest(updateBookingValidationSchema),
  BookingController.update
);

// DELETE — Admin only
route.delete(
  "/:id",
  auth(USER_ROLE.admin),
  BookingController.remove
);

// PATCH — Assign worker to booking (Admin only)
route.patch(
  "/memberships/:membershipId/assign-worker",
  auth(USER_ROLE.admin),
  validateRequest(assignWorkerValidationSchema),
  BookingController.assignWorkerToMembershipBookings
);

route.patch(
  "/memberships/:membershipId/unassign-worker",
  auth(USER_ROLE.admin),
  BookingController.unassignWorkerFromMembershipBookings
);

route.patch(
  "/:id/assign-worker",
  auth(USER_ROLE.admin),
  validateRequest(assignWorkerValidationSchema),
  BookingController.assignWorker
);

// PATCH — Unassign worker from booking (Admin only)
route.patch(
  "/:id/unassign-worker",
  auth(USER_ROLE.admin),
  BookingController.unassignWorker
);

export const bookingNewRoute = route;
