import express from "express";
import auth from "../../app/middlewares/auth";
import validateRequest from "../../app/middlewares/validateRequest";
import { USER_ROLE } from "../Auth/auth.constant";

import {
  createCustomerMembership,
  createMembership,
  deleteMembership,
  getCustomerMemberships,
  getCustomerPlansForCar,
  getAllMemberships,
  getMembershipStats,
  getSingleMembership,
  updateMembership,
} from "./membership.controller";

import {
  createMembershipValidationSchema,
  updateMembershipValidationSchema,
  membershipIdValidationSchema,
  membershipListQueryValidationSchema,
  customerMembershipPurchaseValidationSchema,
} from "./membership.validation";

const route = express.Router();

route.get("/plans", auth("CUSTOMER"), getCustomerPlansForCar);
route.get("/mine", auth("CUSTOMER"), getCustomerMemberships);
route.post(
  "/purchase",
  auth("CUSTOMER"),
  validateRequest(customerMembershipPurchaseValidationSchema),
  createCustomerMembership,
);

route.use(auth(USER_ROLE.admin));

route.post(
  "/",
  validateRequest(createMembershipValidationSchema),
  createMembership
);

route.get(
  "/stats",
  getMembershipStats
);

route.get(
  "/",
  validateRequest(membershipListQueryValidationSchema),
  getAllMemberships
);

route.get(
  "/:id",
  validateRequest(membershipIdValidationSchema),
  getSingleMembership
);

route.put(
  "/:id",
  validateRequest(updateMembershipValidationSchema),
  updateMembership
);

route.delete(
  "/:id",
  validateRequest(membershipIdValidationSchema),
  deleteMembership
);

export const membershipRoute = route;