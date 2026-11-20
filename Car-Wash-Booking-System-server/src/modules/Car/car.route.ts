import express from "express";
import auth from "../../app/middlewares/auth";
import validateRequest from "../../app/middlewares/validateRequest";
import { USER_ROLE } from "../Auth/auth.constant";
import { CarControllers } from "./car.controller";
import {
  createCarValidationSchema,
  updateCarValidationSchema,
  rejectCarValidationSchema,
} from "./car.validation";

const route = express.Router();

// CUSTOMER: logged-in customer's cars
route.get(
  "/my",
  auth("CUSTOMER"),
  CarControllers.getMyCars,
);

// ADMIN: pending cars for approval
route.get(
  "/pending",
  auth(USER_ROLE.admin),
  (req, _res, next) => {
    req.query.verificationStatus = "PENDING";
    next();
  },
  CarControllers.getAllCars,
);

// ADMIN: car statistics
route.get(
  "/stats",
  auth(USER_ROLE.admin),
  CarControllers.getCarStats,
);

// ADMIN + CUSTOMER: create car
route.post(
  "/",
  auth(USER_ROLE.admin, "CUSTOMER"),
  validateRequest(createCarValidationSchema),
  CarControllers.createCar,
);

// ADMIN: all cars
route.get(
  "/",
  auth(USER_ROLE.admin),
  CarControllers.getAllCars,
);

// ADMIN: verify a pending car
route.patch(
  "/:id/verify",
  auth(USER_ROLE.admin),
  CarControllers.verifyCar,
);

// ADMIN: reject a pending car
route.patch(
  "/:id/reject",
  auth(USER_ROLE.admin),
  validateRequest(rejectCarValidationSchema),
  CarControllers.rejectCar,
);

// ADMIN + CUSTOMER: single car
// Service enforces ownership for customers.
route.get(
  "/:id",
  auth(USER_ROLE.admin, "CUSTOMER"),
  CarControllers.getSingleCar,
);

// ADMIN + CUSTOMER: update car
// Service enforces ownership and verification rules.
route.put(
  "/:id",
  auth(USER_ROLE.admin, "CUSTOMER"),
  validateRequest(updateCarValidationSchema),
  CarControllers.updateCar,
);

// ADMIN + CUSTOMER: delete car
// Service enforces ownership for customers.
route.delete(
  "/:id",
  auth(USER_ROLE.admin, "CUSTOMER"),
  CarControllers.deleteCar,
);

export const carRoute = route;